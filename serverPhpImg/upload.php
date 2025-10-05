<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit();
}

if (!isset($_FILES['image'])) {
    echo json_encode(['success' => false, 'error' => 'No image file']);
    exit();
}

$dir = 'img/';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$name = 'img_' . time() . '.jpg';
$path = $dir . $name;

if (move_uploaded_file($_FILES['image']['tmp_name'], $path)) {
    $url = 'http://' . $_SERVER['HTTP_HOST'] . '/img/' . $name;
    echo json_encode(['success' => true, 'url' => $url]);
} else {
    echo json_encode(['success' => false, 'error' => 'Upload failed']);
}
?>