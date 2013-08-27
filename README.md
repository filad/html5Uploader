**Demo**: [http://html5uploader.filkor.org/](http://html5uploader.filkor.org/)


####Please read the [FAQ](http://html5uploader.filkor.org/FAQ.html) for more info.

##Installation notes

- Download the script

- Create a database. You will find the sample database structure in `db-structure.sql`

- Fill in your database credentials. 
  Look at the `mysql-credentials-sample.php` for an example. The server is using PDO for 
  absraction. (MySQL is not the only option.)

- If you want make a different 'theme' for the uploader, the easiest way would be to create a new .css file inside 
  `public_html/assets/css/HTML5Uploader`. (You see there is already a defaultTheme.css stylesheet)
