package controllers.admin.authorities

import akka.actor.ActorSystem
import akka.stream.Materializer
import controllers.{ BaseController, WebJarAssets }
import controllers.admin.{ DumpImporter, StreamImporter }
import java.io.FileInputStream
import javax.inject.{ Inject, Singleton }
import jp.t2v.lab.play2.auth.AuthElement
import play.api.{ Configuration, Logger }
import play.api.mvc.Action
import scala.concurrent.ExecutionContext
import services.task.TaskService
import services.user.{ Role, UserService }
import services.item.place.PlaceService
import services.item.place.crosswalks._

@Singleton
class GazetteerAdminController @Inject() (
  val config: Configuration,
  val users: UserService,
  val placeService: PlaceService,
  val taskService: TaskService,
  val materializer: Materializer,
  implicit val ctx: ExecutionContext,
  implicit val system: ActorSystem,
  implicit val webjars: WebJarAssets
) extends BaseController with AuthElement {

  def index = StackAction(AuthorityKey -> Role.ADMIN) { implicit request =>
    Ok(views.html.admin.authorities.gazetteers())
  }
  
  def importGazetteer = StackAction(AuthorityKey -> Role.ADMIN) { implicit request =>
    request.body.asMultipartFormData.flatMap(_.file("file")) match {
      case Some(formData) => {
        Logger.info("Importing gazetteer from " + formData.filename)
  
        /** TEMPORARY HACK **/
        if (formData.filename.contains(".ttl")) {
          Logger.info("Importing Pelagios RDF/TTL dump")
          val importer = new DumpImporter(taskService) 
          importer.importDump(formData.ref.file, formData.filename, PelagiosRDFCrosswalk.fromRDF(formData.filename), placeService, loggedIn.username)
        } else if (formData.filename.toLowerCase.contains("pleiades")) {
          Logger.info("Using Pleiades crosswalk")
          val importer = new StreamImporter(taskService, materializer)
          importer.importRecords(formData.ref.file, formData.filename, PleiadesCrosswalk.fromJson, placeService, loggedIn.username)
        } else if (formData.filename.toLowerCase.contains("geonames")) {
          Logger.info("Using GeoNames crosswalk")
          val importer = new StreamImporter(taskService, materializer)
          importer.importRecords(formData.ref.file, formData.filename, GeoNamesCrosswalk.fromJson, placeService, loggedIn.username)
        }

        /** TEMPORARY HACK **/
        
        Redirect(routes.GazetteerAdminController.index)
      }
        
      case None => BadRequest
        
    }
  }

}