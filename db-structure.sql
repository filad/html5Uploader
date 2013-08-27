CREATE DATABASE `html5uploader` DEFAULT CHARACTER SET utf8 COLLATE utf8_bin;
USE `html5uploader`;

CREATE TABLE IF NOT EXISTS `files` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) COLLATE utf8_bin NOT NULL,
  `file_size` int(11) NOT NULL,
  `uploaded_bytes` int(11) NOT NULL,
  `user_id` varchar(255) COLLATE utf8_bin NOT NULL,
  `uploaded_time` int(11) NOT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 COLLATE=utf8_bin AUTO_INCREMENT=1;

