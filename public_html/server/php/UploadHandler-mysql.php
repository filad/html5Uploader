<?php
/*
 * HTML5Uploader MySQL PHP Class 1.1
 * https://github.com/filad/html5Uploader
 *
 * Copyright 2014, Adam Filkor
 * http://filkor.org
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

require('UploadHandler.php');


class UploadHandlerMYSQL extends UploadHandler 
{
    protected function initialize() {
        //db init
        $this->db_init();
        parent::initialize();
    }

    protected function db_init() {
        $dsn = $this->options['dsn'];
        $user = $this->options['dbUserName'];
        $pass = $this->options['dbPassword'];

        try {
            $this->pdo = new PDO($dsn, $user, $pass);
        } catch (PDOException $e) {
            echo 'Connection failed: ' . $e->getMessage();
        }

        $this->pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    protected function get_user_id() {
        //let's use a simple method to save the user's files to different directories (based on cookies), 
        //so we only see our own uploads. This is only for the sake of the demo, you will want to use 
        //a more sophisticated method in a real environment. (User authentication, etc..)
        if (!isset($_COOKIE['UploaderUserId'])) {
            $id = uniqid();
            setcookie('UploaderUserId', $id, time() + $this->options['userdir_time_to_live'], '/');
            $_COOKIE['UploaderUserId'] = $id; //cookies always only accessible after the next pageload, this is the workaroud (because this is an ajax request)
        }  
        else {
            $id = $_COOKIE['UploaderUserId'];
        }
        return $id;

        // @session_start();
        // return session_id();
    }

    protected function file_save_db($name, $size, $uploaded_bytes) {
        $user_id = $this->get_user_id();

       $uploaded_time = time();

        $stmt = $this->pdo->prepare('SELECT file_name FROM files WHERE file_name = :file_name AND user_id = :user_id');
        $stmt->execute(array(
            ':file_name' => $name,
            ':user_id' => $user_id
        ));

        if ($stmt->rowCount() > 0) {
            //its a partial upload, we need to update the record
            $uploaded_time = time();
            $stmt = $this->pdo->prepare('UPDATE files SET files.uploaded_bytes = :uploaded_bytes, files.uploaded_time = :uploaded_time WHERE file_name = :file_name AND user_id = :user_id');
            $stmt->execute(array(
                ':uploaded_bytes' => $uploaded_bytes,
                ':uploaded_time' => $uploaded_time,
                ':file_name' => $name,
                ':user_id' => $user_id
            ));
        } 
        else {
            $stmt = $this->pdo->prepare('INSERT INTO files (file_name, file_size, uploaded_bytes, user_id, uploaded_time) 
                                         VALUES (:name, :size, :uploaded_bytes, :user_id, :uploaded_time)');
            $stmt->execute(array(
                ':name' => $name,
                ':size' => $size,
                ':uploaded_bytes' => $uploaded_bytes,
                ':user_id' => $user_id,
                ':uploaded_time' => $uploaded_time
            ));
        }
    }

    protected function get_file_name($name, $type, $index, $content_range) {
        return $this->trim_file_name($name, $type, $index, $content_range);
    }

    protected function get_file_object_db($file_name) {
        $userid = $this->get_user_id();

        $stmt = $this->pdo->prepare('SELECT * FROM files WHERE file_name = :file_name AND user_id = :user_id');
        $stmt->execute(array(
            ':file_name' => $file_name,
            ':user_id' => $userid
        ));
        if ($stmt->rowCount() > 0 && $this->is_valid_file_object($file_name)) {
            $row = $stmt->fetch();
            
            $file = new stdClass();
            $file->name = $row['file_name'];
            $file->size = $row['file_size'];
            $file->uploaded_bytes = $row['uploaded_bytes'];
            $file->url = $this->get_download_url($file->name);
            
            $this->set_file_delete_properties($file);
            return $file;
        }
        return null;
    }

    protected function get_file_objects_db($iteration_method = 'get_file_object_db') {
        $upload_dir = $this->get_upload_path();
        if (!is_dir($upload_dir)) {
            return array();
        }
        return array_values(array_filter(array_map(
            array($this, $iteration_method),
            scandir($upload_dir)
        )));
    }

    public function get($print_response = true) {
        if ($print_response && isset($_GET['download'])) {
            return $this->download();
        }
        $file_name = $this->get_file_name_param();
        if ($file_name) {
            $response = array(
                substr($this->options['param_name'], 0, -1) => $this->get_file_object_db($file_name)
            );
        } else {
            $response = array(
                $this->options['param_name'] => $this->get_file_objects_db()
            );
        }
        return $this->generate_response($response, $print_response);
    }

    protected function is_file_finished_db($file) {
        $user_id = $this->get_user_id();

        $stmt = $this->pdo->prepare('SELECT * FROM files WHERE file_name = :file_name AND user_id = :user_id');
        $stmt->execute(array(
            ':file_name' => $file->name,
            ':user_id' => $user_id
        ));

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch();

            if ($row['uploaded_bytes'] == $row['file_size']) {
                return true;
            }
        }
        return false;
    }

    protected function is_file_exist_in_db($file) {
        $answer = array();
        $user_id = $this->get_user_id();

        $stmt = $this->pdo->prepare('SELECT * FROM files WHERE file_name = :file_name AND user_id = :user_id');
        $stmt->execute(array(
                ':file_name' => $file->name,
                ':user_id' => $user_id
        ));

        if ($stmt->rowCount() > 0) {
                $row = $stmt->fetch();
                $answer[0] = $row['uploaded_bytes'];
                $answer[1] = $row['file_size'];
        }
        return $answer;
    }

    protected function handle_file_upload($uploaded_file, $name, $size, $type, $error,
            $index = null, $content_range = null) {
        $file = new stdClass();
        $file->name = $this->get_file_name($name, $type, $index, $content_range);
        $file->size = $this->fix_integer_overflow(intval($size));
        $file->type = $type;

        if ($this->is_file_finished_db($file)) {
            //if we already finished the file upload
            $this->set_file_delete_properties($file);
            $file->url = $this->get_download_url($file->name);
            return $file;
        }

        $check_file_exist = $this->is_file_exist_in_db($file);
        if (is_array($check_file_exist) && (count($check_file_exist) > 0)) {
            if ($content_range[1] < $check_file_exist[0]) {
                $file->size = $check_file_exist[0];
                return $file;
            }
        }

        if ($this->validate($uploaded_file, $file, $error, $index)) {
            $this->handle_form_data($file, $index);
            $upload_dir = $this->get_upload_path();
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, $this->options['mkdir_mode'], true);
            }
            $file_path = $this->get_upload_path($file->name);
            $append_file = $content_range && is_file($file_path) &&
                $file->size > $this->get_file_size($file_path);
            if ($uploaded_file && is_uploaded_file($uploaded_file)) {
                // multipart/formdata uploads (POST method uploads)
                if ($append_file) {
                    file_put_contents(
                        $file_path,
                        fopen($uploaded_file, 'r'),
                        FILE_APPEND
                    );
                } else {
                    move_uploaded_file($uploaded_file, $file_path);
                }
            } else {
                // Non-multipart uploads (PUT method support)
                file_put_contents(
                    $file_path,
                    fopen('php://input', 'r'),
                    $append_file ? FILE_APPEND : 0
                );
            }
            $file_size = $this->get_file_size($file_path, $append_file);
            if ($file_size === $file->size) {
                $this->file_save_db($file->name, $file->size, $file_size);
                $file->url = $this->get_download_url($file->name);
                if($this->options['handleImages']) {
                    list($img_width, $img_height) = @getimagesize($file_path);
                    if (is_int($img_width)) {
                        $this->handle_image_file($file_path, $file);
                    }
                }   
            } else {
                $this->file_save_db($file->name, $file->size, $file_size);
                $file->size = $file_size;
                if (!$content_range && $this->options['discard_aborted_uploads']) {
                    unlink($file_path);
                    $file->error = 'abort';
                }
            }
            $this->set_file_delete_properties($file);
        }
        return $file;
    }
}
?>