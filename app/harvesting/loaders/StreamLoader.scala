package harvesting.loaders

import akka.Done
import akka.actor.ActorSystem
import akka.stream.{ ActorAttributes, ClosedShape, Materializer, Supervision }
import akka.stream.scaladsl._
import akka.util.ByteString
import harvesting.HasBatchImport
import java.io.{ File, InputStream }
import scala.concurrent.{ Await, ExecutionContext, Future }
import scala.concurrent.duration._
import services.item.ItemType
import services.task.{ TaskService, TaskStatus, TaskType }

class StreamLoader(taskService: TaskService, taskType: TaskType, implicit val materializer: Materializer) extends BaseLoader {

  private val BATCH_SIZE = 200

  private val decider: Supervision.Decider = {
    case t: Throwable =>
      t.printStackTrace()
      Supervision.Stop
  }
  
  private def countLines(file: File) =
    scala.io.Source.fromFile(file).getLines.size
 
  def importRecords[T](caption: String, file: File, filename: String, crosswalk: String => Option[T], importer: HasBatchImport[T],
      username: String)(implicit ctx: ExecutionContext, system: ActorSystem) = {
    
    val totalLines = countLines(file)
    var processedLines = 0
    
    val taskId = Await.result(taskService.insertTask(taskType, importer.getClass.getName, caption, username), 10.seconds)
    taskService.updateStatus(taskId, TaskStatus.RUNNING)

    val source = StreamConverters.fromInputStream(() => getStream(file, filename), 1024)
      .via(Framing.delimiter(ByteString("\n"), maximumFrameLength = Int.MaxValue, allowTruncation = false))
      .map(_.utf8String)

    val parser = Flow.fromFunction[String, Option[T]](crosswalk)
      .withAttributes(ActorAttributes.supervisionStrategy(decider))
      .grouped(BATCH_SIZE)

    val sink = Sink.foreach[Seq[Option[T]]] { records =>
      val toImport = records.flatten
      Await.result(importer.importBatch(toImport), 10.minutes)
      
      processedLines += records.size
      val progress = Math.ceil(100 * processedLines.toDouble / totalLines).toInt
      taskService.updateProgress(taskId, progress)      
    }

    val graph = RunnableGraph.fromGraph(GraphDSL.create(sink) { implicit builder => sink =>

      import GraphDSL.Implicits._

      source ~> parser ~> sink

      ClosedShape
    }).withAttributes(ActorAttributes.supervisionStrategy(decider))
 
    graph.run().map { _ =>
      taskService.setCompleted(taskId).map(_ =>
        system.scheduler.scheduleOnce(1.minute)(taskService.deleteById(taskId)))
    } recoverWith { case t: Throwable =>
      taskService.setFailed(taskId, Some(t.getMessage)).map(_ =>
        system.scheduler.scheduleOnce(1.minute)(taskService.deleteById(taskId)))
    }    
  }

}
