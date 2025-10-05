<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

echo json_encode(['success' => false, 'error' => 'Upload endpoint not ready']);
?>