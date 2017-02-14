package services.item.place

import com.vividsolutions.jts.geom.{ Coordinate, Geometry }
import services.{ HasDate, HasGeometry, HasNullableSeq }
import org.joda.time.DateTime
import play.api.libs.json._
import play.api.libs.json.Reads._
import play.api.libs.functional.syntax._
import services.item.{ Description, TemporalBounds }

case class GazetteerRecord (

  /** Canonical gazetteer URI **/
  uri: String,

  /** Gazetteer name, used internally in Recogito **/
  sourceGazetteer: Gazetteer,

  /** Time the record was last synchronized from a current gazetteer dump **/
  lastSyncedAt: DateTime,

  /** Time the record was last changed, according to the gazetteer **/ 
  lastChangedAt: Option[DateTime],
  
  /** A 'title' for the record to use for screen display **/
  title: String,

  /** List of descriptions **/
  descriptions: Seq[Description],

  /** List of names **/
  names: Seq[Name],

  /** Geometry **/
  geometry: Option[Geometry],

  /** A representative point (not necessarily same as centroid) **/
  representativePoint: Option[Coordinate],

  /** The temporal bounds of this record **/
  temporalBounds: Option[TemporalBounds],
  
  /** Place types assigned by the gazetteer **/
  placeTypes: Seq[String],
  
  
  
  // An optional ISO country code 
  // TODO countryCode: Option[CountryCode],
  
  // An optional population count - potentially useful for sorting
  // TODO population: Option[Long],
  
  // TODO region names?

  // TODO isPartOf
  
  
  
  
  /** closeMatch URIs **/
  closeMatches: Seq[String],

  /** exactMatch URIs **/
  exactMatches: Seq[String]

) {

  /** For convenience **/
  lazy val allMatches = closeMatches ++ exactMatches

  /** Returns true if there is a connection between the two records.
    *
    * A connection can result from one of the following three causes:
    * - this record lists the other record's URI as a close- or exactMatch
    * - the other record lists this record's URI as a close- or exactMatch
    * - both records share at least one close/exactMatch URI
    */
  def isConnectedWith(other: GazetteerRecord): Boolean =
    allMatches.contains(other.uri) ||
    other.allMatches.contains(uri) ||
    allMatches.exists(matchURI => other.allMatches.contains(matchURI))

}

object GazetteerRecord extends HasDate with HasGeometry with HasNullableSeq {
  
  /** Utility method to normalize a URI to a standard format
    * 
    * Removes '#this' suffixes (used by Pleiades) and, by convention, trailing slashes. 
    */
  def normalizeURI(uri: String) = {
    val noThis = if (uri.indexOf("#this") > -1) uri.substring(0, uri.indexOf("#this")) else uri
      
    if (noThis.endsWith("/"))
      noThis.substring(0, noThis.size - 1)
    else 
      noThis
  }
  
  /** Utility to create a cloned record, with all URIs normalized **/
  def normalize(r: GazetteerRecord) = 
    r.copy(
     uri = normalizeURI(r.uri),
     closeMatches = r.closeMatches.map(normalizeURI),
     exactMatches = r.exactMatches.map(normalizeURI)
    )

  /** JSON (de)serialization **/
  implicit val gazetteerRecordFormat: Format[GazetteerRecord] = (
    (JsPath \ "uri").format[String] and
    (JsPath \ "source_gazetteer").format[Gazetteer] and
    (JsPath \ "last_synced_at").format[DateTime] and
    (JsPath \ "last_changed_at").formatNullable[DateTime] and
    (JsPath \ "title").format[String] and
    (JsPath \ "descriptions").formatNullable[Seq[Description]]
      .inmap[Seq[Description]](fromOptSeq[Description], toOptSeq[Description]) and
    (JsPath \ "names").formatNullable[Seq[Name]]
      .inmap[Seq[Name]](fromOptSeq[Name], toOptSeq[Name]) and
    (JsPath \ "geometry").formatNullable[Geometry] and
    (JsPath \ "representative_point").formatNullable[Coordinate] and
    (JsPath \ "temporal_bounds").formatNullable[TemporalBounds] and
    (JsPath \ "place_types").formatNullable[Seq[String]]
      .inmap[Seq[String]](fromOptSeq[String], toOptSeq[String]) and
      
    // TODO (JsPath \ "country_code").formatNullable[CountryCode] and
    // TODO (JsPath \ "population").formatNullable[Long] and
      
    (JsPath \ "close_matches").formatNullable[Seq[String]]
      .inmap[Seq[String]](fromOptSeq[String], toOptSeq[String]) and
    (JsPath \ "exact_matches").formatNullable[Seq[String]]
      .inmap[Seq[String]](fromOptSeq[String], toOptSeq[String])
  )(GazetteerRecord.apply, unlift(GazetteerRecord.unapply))

}

/*
case class CountryCode(code: String) {
  
  require(code.size == 2, s"Invalid country code: $code (must be two characters)")
  require(code.toUpperCase == code, s"Invalid country code: code (must be uppercase)")
  
}

object CountryCode {

  implicit val countryCodeFormat: Format[CountryCode] =
    Format(
      JsPath.read[String].map(CountryCode(_)),
      Writes[CountryCode](c => JsString(c.code))
    )
   
}
*/