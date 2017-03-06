package harvesting

import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import java.io.{ File, FileOutputStream }
import java.util.UUID
import javax.inject.Inject
import play.api.Logger
import play.api.libs.ws.{ WSClient, StreamedResponse }
import play.api.libs.Files.TemporaryFile
import scala.concurrent.{ ExecutionContext, Future }

class FileDownloader @Inject() (ws: WSClient, implicit val materializer: Materializer, implicit val ctx: ExecutionContext) {
  
  private val TMP_DIR = System.getProperty("java.io.tmpdir")
  
  private val MAX_RETRIES = 5
  
  private val KNOWN_EXTENSIONS = Set("rdf", "rdf.xml", "ttl", "n3", "json")
  
  private val EXTENSION_BY_CONTENT_TYPE = Seq(
    "application/rdf+xml" -> "rdf",
    "text/turtle" -> "ttl",
    "text/n3" -> "n3",
    "application/json" -> "json")
  
  // TODO if we want to compute file hashes (to check for changes) - this is probably the place to put the code
 
  def getExtension(url: String, contentType: Option[String]): String = {
    KNOWN_EXTENSIONS.find(ext => url.endsWith(ext)) match {
      case Some(extension) =>
        // If the URL ends with a known extension - fine
        extension
        
      case None if contentType.isDefined =>
        // If not, try via response Content-Type
        EXTENSION_BY_CONTENT_TYPE.find { case(prefix, extension) =>
          contentType.get.startsWith(prefix) }.map(_._2).get
    }
  }
  
  def download(url: String, retries: Int = MAX_RETRIES): Future[TemporaryFile] = {
    val filename = UUID.randomUUID.toString
    val tempFile = new TemporaryFile(new File(TMP_DIR, filename + ".download"))
    val fStream = ws.url(url).withFollowRedirects(true).stream()
    
    fStream.flatMap { response =>
      val outputStream = new FileOutputStream(tempFile.file)      
      val sink = Sink.foreach[ByteString](bytes => outputStream.write(bytes.toArray))
      
      response.body.runWith(sink).andThen {
        case result =>
          outputStream.close()
          result.get
      } map {_ =>
        val contentType = response.headers.headers.get("Content-Type").flatMap(_.headOption)
        val extension = getExtension(url, contentType)
        tempFile.file.renameTo(new File(TMP_DIR, filename + "." + extension))
        tempFile
      }
      
    } recoverWith { case t: Throwable =>
      if (retries > 0) download(url, retries - 1)
      else throw t
    }
  }

}