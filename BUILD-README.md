# ProElements Build Tools

Scripts Node.js pour regénérer et minifier le fichier `editor.js` avec les corrections appliquées.

## Installation

```bash
npm install
```

## Scripts disponibles

### Build complet (recommandé)
```bash
npm run build
# ou
node build-editor.js
```
- ✅ Crée une sauvegarde automatique
- ✅ Applique le fix `createDocumentSaveHandles`
- ✅ Minifie le fichier

### Build rapide
```bash
npm run build:quick
# ou
node quick-build.js
```
Equivalent au build complet mais avec des messages simplifiés.

### Options avancées

#### Appliquer seulement le fix (sans minification)
```bash
npm run build:fix-only
# ou
node build-editor.js --no-minify
```

#### Minifier seulement (sans appliquer le fix)
```bash
npm run build:minify-only
# ou
node build-editor.js --no-fix
```

#### Build sans sauvegarde
```bash
npm run build:no-backup
# ou
node build-editor.js --no-backup
```

### Gestion des sauvegardes

#### Restaurer depuis la sauvegarde
```bash
npm run restore
# ou
node build-editor.js --restore
```

#### Nettoyer les fichiers générés
```bash
npm run clean
```

### Analyse et debugging

#### Voir les statistiques de fichiers
```bash
npm run stats
# ou
node diff-editor.js stats
```

#### Comparer original vs modifié
```bash
npm run diff
# ou
node diff-editor.js diff
```

### Aide
```bash
npm run help
# ou
node build-editor.js --help
```

## Workflow recommandé

1. **Première utilisation** : `npm install` puis `npm run build`
2. **Développement** : `npm run build:quick` après chaque modification
3. **Vérification** : `npm run stats` pour voir les statistiques
4. **Problème** : `npm run restore` pour revenir à l'original
5. **Nettoyage** : `npm run clean` pour supprimer les fichiers générés

## Le fix appliqué

Le script corrige automatiquement la méthode `createDocumentSaveHandles()` dans le module loop-builder en ajoutant :

- ✅ Vérification de l'existence de `elementorFrontend?.config?.elements?.data`
- ✅ Vérifications de sécurité pour `element` et `element.attributes`
- ✅ Gestion d'erreur avec `try/catch`
- ✅ Messages de console pour le debugging

## Fichiers générés

- `assets/js/editor.js` - Version modifiée avec le fix
- `assets/js/editor.min.js` - Version minifiée (réduction ~53%)
- `assets/js/editor.js.backup` - Sauvegarde automatique (si activée)

## Intégration VS Code

Les tâches suivantes sont disponibles dans VS Code (Ctrl+Shift+P → "Tasks: Run Task") :
- **ProElements: Build Editor** - Build complet
- **ProElements: Quick Build** - Build rapide

## Troubleshooting

### Erreur "Source file not found"
Le fichier `assets/js/editor.js` n'existe pas. Vérifiez le chemin ou restaurez depuis la sauvegarde.

### Le fix ne s'applique pas
Le code source a peut-être déjà été modifié. Utilisez `npm run restore` puis relancez le build.

### Problème de minification
Vérifiez que Terser est installé : `npm list terser`

### Performance
La minification réduit la taille du fichier de ~53% (395KB → 185KB)
