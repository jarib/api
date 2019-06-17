SELECT
    f.id AS file_id
  , f.importer_id AS importer_id
  , f.name AS file_name

  , f.registered_date AS registered_date
  , f.date_imported AS date_imported
  , f.date_imported_documentcloud AS date_imported_documentcloud

FROM
  file f

ORDER BY
    importer_id ASC
  , file_id ASC
  , registered_date ASC

LIMIT
  $1
;
