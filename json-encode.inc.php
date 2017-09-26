<?php
  function sqlsrv_query_to_json($qry){
    $json = [];
    $json['metadata'] = [];
    $json['data'] = [];
    while($row = sqlsrv_fetch_array($qry, SQLSRV_FETCH_ASSOC)){
      $json['data'][] = $row;
    }
    foreach(sqlsrv_field_metadata($qry) as $field){
      $json['metadata'][] = $field;
    }
    return json_encode($json);
  }
 ?>
