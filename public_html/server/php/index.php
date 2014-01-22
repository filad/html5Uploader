<?php
/*
 * HTML5Uploader
 * https://github.com/filad/html5Uploader
 *
 * Copyright 2014, Adam Filkor
 * http://filkor.org
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

error_reporting(E_ALL | E_STRICT);
// require('UploadHandler.php');
// $upload_handler = new UploadHandler();

require('UploadHandler-mysql.php');

//
// Ideally you should move your MySQL credentials outside of the public_html directory
// because of security reasons.
//
require(dirname(__FILE__) . '/../../../mysql-credentials.php');


//the $dsn, $dbUsername, $dbPassword below come from the external mysql credentials.php
//like:
//$dsn = 'mysql:dbname=html5uploader;host=localhost;charset=utf8';
//$dbUsername = 'YOUR DB USERNAME';
//$dbPassword = 'YOURS DB PASSWORD';
$options = array(
	'dsn' => $dsn,
	'dbUserName' => $dbUsername,
	'dbPassword' => $dbPassword,
	'user_dirs' => true,
	'userdir_time_to_live' => 7200
);

$upload_handler = new UploadHandlerMYSQL($options);
