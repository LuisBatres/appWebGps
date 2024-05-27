const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const url = require('url');

const dbUrl = process.env.JAWSDB_URL || 'mysql://io2m4ubltat0x66b:zfzelx9n70e9qr98@i5x1cqhq5xbqtv00.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/mu3m62sk32xa74ck';
const params = url.parse(dbUrl);
const [username, password] = params.auth.split(':');

// Configuración de la base de datos
const db = mysql.createConnection({
    host: params.hostname,
    user: username,
    password: password,
    database: params.pathname.split('/')[1]
});

db.connect((err) => {
    if (err) throw err;
    console.log('Conectado a la base de datos MySQL');
});

// Configuración de la sesión
app.use(session({
    secret: 'llave',
    resave: false,
    saveUninitialized: false
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'template'));

// Middleware para servir archivos estáticos desde el directorio "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Middleware para verificar si el usuario está autenticado
function loginRequired(req, res, next) {
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }
    next();
}

// Rutas
app.get('/', loginRequired, (req, res) => {
    res.render('index', { session: req.session });
});

app.get('/login', (req, res) => {
    res.render('login', { mensaje: "" });
});


app.post('/login', (req, res) => {
    const { txtUsuario, txtCorreo, txtPassword } = req.body;
    const query = 'SELECT * FROM usuario WHERE usuario = ? AND correo = ? AND contrasena = ?';
    db.query(query, [txtUsuario, txtCorreo, txtPassword], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.idUsuario = results[0].idUsuario;
            req.session.usuario = results[0].usuario;
            res.redirect('/');
        } else {
            res.render('login', { mensaje: "Usuario o Contraseña Incorrectas" });
        }
    });
});

app.get('/gallery', loginRequired, (req, res) => {
    const query = 'SELECT * FROM imagen WHERE usuarioidUsuario = ?';
    db.query(query, [req.session.idUsuario], (err, results) => {
        if (err) throw err;
        res.render('gallery', { session: req.session, images: results });
    });
});

app.post('/upload', loginRequired, upload.single('file'), (req, res) => {
    const filename = req.file.filename;
    const filePath = `/uploads/${filename}`;
    const query = 'INSERT INTO imagen (nombre, ruta, usuarioidUsuario) VALUES (?, ?, ?)';
    db.query(query, [filename, filePath, req.session.idUsuario], (err, results) => {
        if (err) throw err;
        res.redirect('/gallery');
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/login');
    });
});

app.post('/delete_image/:idImagen', loginRequired, (req, res) => {
    const query = 'DELETE FROM imagen WHERE idImagen = ?';
    db.query(query, [req.params.idImagen], (err, results) => {
        if (err) throw err;
        res.redirect('/gallery');
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log('Servidor iniciado en el puerto 3000');
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
