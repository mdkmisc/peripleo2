package controllers

import jp.t2v.lab.play2.auth.{ AsyncIdContainer, AuthConfig, CookieTokenAccessor, CookieIdContainer }
import scala.concurrent.{ ExecutionContext, Future }
import scala.reflect.{ ClassTag, classTag }
import play.api.Play
import play.api.cache.CacheApi
import play.api.mvc.{ Result, Results, RequestHeader }
import javax.inject.Inject

trait Security extends AuthConfig { self: HasConfig with HasUserService =>

  type Id = String

  type User = services.user.User

  val idTag: ClassTag[Id] = classTag[Id]

  val sessionTimeoutInSeconds: Int = 3600

  def resolveUser(id: Id)(implicit ctx: ExecutionContext): Future[Option[User]] =
    self.users.findByUsername(id)

  def loginSucceeded(request: RequestHeader)(implicit ctx: ExecutionContext): Future[Result] = {
    val destination = request.session.get("access_uri").getOrElse(controllers.admin.routes.GazetteerAdminController.index.toString)
    Future.successful(Results.Redirect(destination).withSession(request.session - "access_uri"))
  }

  def logoutSucceeded(request: RequestHeader)(implicit ctx: ExecutionContext): Future[Result] =
    Future.successful(Results.Redirect(admin.routes.LoginLogoutController.showLoginForm(None)))

  def authenticationFailed(request: RequestHeader)(implicit ctx: ExecutionContext): Future[Result] =
    Future.successful(Results.Redirect(admin.routes.LoginLogoutController.showLoginForm(None)).withSession("access_uri" -> request.uri))

  override def authorizationFailed(request: RequestHeader, user: User, authority: Option[Authority])(implicit context: ExecutionContext): Future[Result] =
    Future.successful(Results.Forbidden("Forbidden"))

  def authorize(user: User, authority: Authority)(implicit ctx: ExecutionContext): Future[Boolean] = Future.successful {
    authority match {
      case _ => true // We're not using authority levels at this time
    }
  }

  override lazy val tokenAccessor = new CookieTokenAccessor(
    cookieSecureOption = config.getBoolean("auth.cookie.secure").getOrElse(false),
    cookieMaxAge       = Some(sessionTimeoutInSeconds)
  )

  override lazy val idContainer: AsyncIdContainer[Id] = AsyncIdContainer(new CookieIdContainer[Id])

}
