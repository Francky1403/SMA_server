const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Demande, Payment, sequelize } = require('./models');
const SECRET_KEY = 'Jesus_christ_sauveur';
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');



const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
  origin: /http:\/\/localhost/
}));
app.options('*', cors());

// Configuration du stockage des fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    var uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    var ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// Route pour créer une demande
app.post('/api/demande', upload.single('photo'), [
  body('type').notEmpty().withMessage('Le type est requis.'),
  body('name').notEmpty().withMessage('Le nom est requis.'),
  body('firstName').notEmpty().withMessage('Le prénom est requis.'),
  body('email').isEmail().withMessage('L\'email doit être valide.'),
  body('country').notEmpty().withMessage('Le pays est requis.'),
  body('phone').notEmpty().withMessage('Le téléphone est requis.'),
  body('intention').notEmpty().withMessage('L\'intention est requise.'),
  body('prix').isNumeric().withMessage('Le prix doit être un nombre.'),
  body('paymentMethod').notEmpty().withMessage('Le mode de paiement est requis.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { type, name, firstName, email, country, phone, intention, prix, paymentMethod } = req.body;
  const photo = req.file;

  try {
    const newRequest = await Demande.create({
      type,
      photo: photo ? photo.filename : null,
      name,
      firstName,
      email,
      country,
      phone,
      intention,
      prix,
      payment: paymentMethod,
    });

    res.status(201).json({ newRequest });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la demande', details: error.message });
  }
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Erreur interne du serveur', details: err.message });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Erreur interne du serveur', details: err.message });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Erreur interne du serveur', details: err.message });
});


app.use('/uploads', express.static('uploads'));

// route pour afficher les messes
app.get('/api/messe', async (req, res) => {
  try {
    const requests = await Demande.findAll({
      order: [['createdAt', 'DESC']] 
    });

    const requestsWithPhotoUrl = requests.map(request => ({
      ...request.toJSON(),
      photoUrl: request.photo ? `${req.protocol}://${req.get('host')}/uploads/${request.photo}` : null,
    }));

    res.json(requestsWithPhotoUrl);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des demandes.' });
  }
});

// Route pour créer un utilisateur
app.post('/api/utilisateur', async (req, res) => {
  const { username, email, password, profile } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      profile
    });

    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});// le createdby est là où sera stoker l'information de l'utilisateur createur

// Route pour afficher les utilisateurs
app.get('/api/user', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']] 
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////
// VerifyToken pour la vérification de token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token non fourni' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide' });
    }

    req.userId = decoded.id;
    next();
  });
};
// Route pour afficher un utilisateur
app.get('/api/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour modifier un utilisateur
app.put('/api/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, profile,} = req.body; 

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.username = username;
    user.email = email;
    user.profile = profile;
    await user.save();

    res.json(user);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour modifier le password MonCompte
app.put('/api/user/:id/password', async (req, res) => {
  try {
    const userId = req.params.id;
    const { oldPassword, newPassword } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour modifier le password utilisateur
app.put('/api/user/:id/passwords', async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPasswords } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.password = await bcrypt.hash(newPasswords, 10);
    await user.save();

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    console.error('Error updating password:', error); // Log the error for debugging
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour se déconnecter
app.post('/api/logout', (req, res) => {
  try {
    // Forcing client-side token removal
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour se connecter
app.post('/api/login', async (req, res) => {
  const email = req.body.email
  const password = req.body.password

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    if (!user.IsActive) {  
      return res.status(402).json({ error: 'Utilisateur inactif' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log('Mot de passe incorrect');
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    if (user) {
    var token = jwt.sign({foo: 'bar', userdata: {user}}, SECRET_KEY, {
      expiresIn: '5h'
    });
    }

    res.json(token);
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Route pour obtenir le nombre total de demandes
app.get('/api/stats/total-demande', async (req, res) => {
  try {
    const totalDemande = await Demande.count();
    res.json({ totalDemande });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du total des demandes' });
  }
});

// Route pour obtenir le nombre total d'utilisateurs
app.get('/api/stats/total-utilisateurs', async (req, res) => {
  try {
    const totalUtilisateurs = await User.count();
    res.json({ totalUtilisateurs });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du total des utilisateurs' });
  }
});

// Route pour obtenir le nombre total de demandes traitées
app.get('/api/stats/demandes-traitees', async (req, res) => {
  try {
    const demandesTraitees = await Demande.count({ where: { traité: false } });
    res.json({ demandesTraitees });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du nombre de demandes traitées' });
  }
});

// Route pour obtenir le nombre total de demandes non traitées
app.get('/api/stats/demandes-non-traitees', async (req, res) => {
  try {
    const demandesNonTraitees = await Demande.count({ where: { traité: true } });
    res.json({ demandesNonTraitees });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du nombre de demandes non traitées' });
  }
});

// Route pour obtenir le nombre total d'utilisateurs actifs
app.get('/api/stats/utilisateurs-actifs', async (req, res) => {
  try {
    const utilisateursActifs = await User.count({ where: { isActive: true } });
    res.json({ utilisateursActifs });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du nombre d\'utilisateurs actifs' });
  }
});

// Route pour obtenir le nombre total d'utilisateurs inactifs
app.get('/api/stats/utilisateurs-inactifs', async (req, res) => {
  try {
    const utilisateursInactifs = await User.count({ where: { isActive: false } });
    res.json({ utilisateursInactifs });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du nombre d\'utilisateurs inactifs' });
  }
});

// Route pour obtenir le nombre total de gestionnaires
app.get('/api/stats/total-gestionnaires', async (req, res) => {
  try {
    const totalGestionnaires = await User.count({ where: { profile: 'gestionnaire' } });
    res.json({ totalGestionnaires });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du nombre de gestionnaires' });
  }
});
  
// Route pour obtenir le nombre total d'administrateurs
app.get('/api/stats/total-administrateurs', async (req, res) => {
  try {
    const totalAdministrateurs = await User.count({ where: { profile: 'administrateur' } });
    res.json({ totalAdministrateurs });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du nombre d\'administrateurs' });
  }
});

// Route total messe anniversaire
app.get('/api/stats/messe-anniversaire', async (req, res) => {
  try {
    const totalAnniversaire = await Demande.count({
      where: { type: "messe d'anniversaire" }
    });

    res.json({ totalAnniversaire });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).send('Erreur lors de la récupération des demandes de messe.');
  }
});

// Route total messe décès
app.get('/api/stats/messe-deces', async (req, res) => {
  try {
    const totalDeces = await Demande.count({
      where: { type: 'messe de décès' }
    });

    res.json({ totalDeces });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).send('Erreur lors de la récupération des demandes de messe.');
  }
});

// Route total messe intention particulière
app.get('/api/stats/intention-particuliere', async (req, res) => {
  try {
    const totalIntentionParticuliere = await Demande.count({
      where: { type: 'intention particulière' }
    });

    res.json({ totalIntentionParticuliere });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).send('Erreur lors de la récupération des demandes de messe.');
  }
});

// Route total messe action de grâce
app.get('/api/stats/action-grace', async (req, res) => {
  try {
    const totalActionGrace = await Demande.count({
      where: { type: 'action de grâce' }
    });

    res.json({ totalActionGrace });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).send('Erreur lors de la récupération des demandes de messe.');
  }
});

// route pour le prix total
app.get('/api/total-prix', async (req, res) => {
  try {
    // Calculer la somme des prix
    const total = await Demande.sum('prix');
    res.json({ total });
  } catch (error) {
    console.error('Erreur lors du calcul de la somme des prix:', error);
    res.status(500).json({ message: 'Erreur lors du calcul de la somme des prix' });
  }
});

// route pour le prix total par rapport a la carte bancaire
app.get('/api/total-cb', async (req, res) => {
  try {
    // Calculer la somme des prix pour les demandes de type 'action de grâce'
    const total = await Demande.sum('prix', {
      where: {
        payment: 'cb' // Filtrer par type de demande
      }
    });
    res.json({ total });
  } catch (error) {
    console.error('Erreur lors du calcul de la somme des prix:', error);
    res.status(500).json({ message: 'Erreur lors du calcul de la somme des prix' });
  }
});

//route pour le prix total par rapport a mobile money
app.get('/api/total-mm', async (req, res) => {
  try {
    // Calculer la somme des prix pour les demandes de type 'action de grâce'
    const total = await Demande.sum('prix', {
      where: {
        payment: 'mobileMoney' // Filtrer par type de demande
      }
    });
    res.json({ total });
  } catch (error) {
    console.error('Erreur lors du calcul de la somme des prix:', error);
    res.status(500).json({ message: 'Erreur lors du calcul de la somme des prix' });
  }
});

// Route pour voir la statistique messe par moi
app.get('/api/messe-monthly-stats', async (req, res) => {
  try {
    
    const demandes = await Demande.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', 'id'), 'messeRequests']
      ],
      group: ['month'],
      order: [['month', 'ASC']],
      raw: true
    });

    
    const messeData = demandes.map(demande => ({
      name: new Date(demande.month + '-01').toLocaleString('default', { month: 'short', year: 'numeric' }),
      messeRequests: parseInt(demande.messeRequests, 10)
    }));

    res.json(messeData);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques mensuelles des demandes:', error.message);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.get('/api/stats/mensuel-demandes', async (req, res) => {
  try {
    const demandes = await Demande.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'month'],
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['month', 'type'],
      order: [[sequelize.literal('month'), 'ASC']]
    });

    const formattedData = demandes.reduce((acc, demande) => {
      const { month, type, count } = demande.dataValues;
      if (!acc[month]) acc[month] = {};
      acc[month][type] = count;
      return acc;
    }, {});

    res.json(formattedData);
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes mensuelles:', error);
    res.status(500).send('Erreur lors de la récupération des demandes mensuelles.');
  }
});

// Route pour obtenir la répartition des demandes de messe par type
app.get('/api/messe-repartition', async (req, res) => {
  try {
    const stats = await Demande.findAll({
      attributes: [
        'intention',
        [sequelize.fn('COUNT', sequelize.col('intention')), 'value']
      ],
      group: 'intention'
    });

    const pieData = stats.map(stat => ({
      name: stat.intention,
      value: stat.value
    }));

    res.json({ pieData });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur lors de la récupération des statistiques.');
  }
});

// Route pour changer le statut d'une demande de messe
app.put('/api/demandes/:id/traiter', async (req, res) => {
  const demandeId = req.params.id;

  try {
    const demande = await Demande.findByPk(demandeId);

    if (!demande) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    await demande.update({ traité: false });
    await demande.save();

    res.status(200).json({ message: 'Demande mise à jour avec succès', demande });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la demande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour activer ou désactiver un utilisateur
app.put('/api/utilisateurs/:id/statuts', async (req, res) => {
  const userId = req.params.id;

  try {

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.IsActive = !user.IsActive;
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur le port ${port}`);
});
