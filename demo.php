<?php
/**
 * DearGift - Demo Preview Router
 */
$id = isset($_GET['id']) ? preg_replace('/[^0-9a-zA-Z_-]/', '', $_GET['id']) : '69';
$demoFile = __DIR__ . '/demos/demo_' . $id . '.html';

if (!file_exists($demoFile)) {
    // Check if it's a direct path
    if (file_exists(__DIR__ . '/' . $id)) {
        $demoFile = __DIR__ . '/' . $id;
    } else {
        $demoFile = __DIR__ . '/demos/demo_69.html';
    }
}

if (file_exists($demoFile)) {
    header('Content-Type: text/html; charset=utf-8');
    $content = file_get_contents($demoFile);
    // Replace remote assets with local assets
    $content = str_replace('https://deargift.love/css/', 'css/', $content);
    $content = str_replace('https://deargift.love/js/', 'js/', $content);
    $content = str_replace('https://deargift.love/assets/', 'assets/', $content);
    $content = str_replace('https://deargift.love/templates/', 'templates/', $content);
    $content = str_replace('https://deargift.love/uploads/', 'uploads/', $content);
    echo $content;
} else {
    http_response_code(404);
    echo "<h1>Mẫu quà tặng không tồn tại hoặc đang cập nhật.</h1>";
}
?>
