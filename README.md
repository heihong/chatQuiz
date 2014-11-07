
========
Read me
=========

##### Projet d'application web : Quiz temps réel multijoueur.
##### Groupe : GUILLEBAUD Vincent	TRAING Hei-Hong

##### Objectif : 

réaliser un jeu de quiz en temps réel entre plusieurs joueurs. Les questions posées sont tirées aléatoirement dans une base de données et les joueurs ont 30 secondes pour donner la bonne réponse.
Le premier joueur donnant la bonne réponse aura 5 points. Le second 3 points, le troisième 2 points et tous les autres joueurs donnant la bonne réponse auront 1 point.
Les utilisateurs doivent s’enregistrer afin que nous puissions conserver leurs scores.
Les utilisateurs ont une seule zone pour discuter avec les autres utilisateurs et proposer leurs réponses afin de simplifier la navigation.

##### Choix techniques :

**NodeJs :** afin de réaliser le quiz en temps réel nous devions utiliser les web socket pour synchroniser le jeu avec tous les utilisateurs. Nous avons choisi d’utiliser NodeJs car il est assez simple d’utiliser les web socket dans ce langage de plus nous souhaitions progresser en Javascript.

**SQLite :** Pour la persistance des données nous avons choisi d’utiliser SQLIte. Cette base de donnée est simple d’utilisation et ne nécessite pas d’installation particulière ce qui était plus simple pour déployer notre projet en ligne.

**Bootstrap :** nous souhaitions avoir un design sobre et accessible sur tous types d’appareils. Pour cela nous avons utilisé Bootstrap afin d’avoir une mise en page responsive.

##### Sources et déploiement : 

Nous avons souhaité déployé notre projet sur un serveur en ligne. Nous avons rencontré plusieurs difficultés pour déployer l’application. Après de nombreux essais, le système de chat et de quiz en ligne fonctionne, toutefois l’inscription ne fonctionne pas. 

La version en ligne du projet est disponible à l’adresse suivante : http://multiplayer-quiz-game.herokuapp.com/ 
il est possible d’utiliser l’identifiant suivant :
Login : vincent
Password : toto

Les sources du projet sont disponibles à l’adresse suivante : https://github.com/heihong/chatQuiz



