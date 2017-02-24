package services.item.search

import play.api.libs.json._
import play.api.libs.json.Reads._
import play.api.libs.functional.syntax._
import services.item.Item

case class RichResultPage(took: Long, total: Long, offset: Int, limit: Long, items: Seq[Item], aggregations: Seq[Aggregation], topPlaces: TopPlaces)

object RichResultPage {

  /** JSON serialization **/
  implicit val richResultPageWrites: Writes[RichResultPage] = (
    (JsPath \ "took").write[Long] and
    (JsPath \ "total").write[Long] and
    (JsPath \ "offset").write[Int] and
    (JsPath \ "limit").write[Long] and
    (JsPath \ "items").write[Seq[Item]] and
    (JsPath \ "aggregations").write[Seq[Aggregation]] and
    (JsPath \ "top_places").write[TopPlaces]
  )(unlift(RichResultPage.unapply))
  
}