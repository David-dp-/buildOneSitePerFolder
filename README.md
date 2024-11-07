# buildOneSitePerFolder

This is a minimal, public project to discover how Webpack 5 can most simply support:
1. In a single webpack build, create multiple standalone sites under a single domain but each under a different query path.
1. All sites share a template.html and default CSS, js, json, image, mp4, etc resources.
1. A new site can be introduced by creating a *leaf* folder under src/configOfVersionsAndSites/ that contains overrides in the form of json, CSS, etc. All json and other resources/assets found along the path to this leaf will be used as defaults that the leaf resources/assets might override. The webpack configuration will automatically create an output folder for the new site (and delete any output folders for sites that have been deleted under src/ ).

## Scenario
There is an international scientific study to measure squirrel tails. Study sites in Europe where squirrels are red should have a red background.
Sites in North America where squirrels are grey should have a grey background. Within any site there might be multiple languages for which the
site should have a localized index.html; for example, the Brussels site has some scientists who expect Flemish (i.e., nl-BE) while others expect
Belgian French (i.e., fr-BE).

Also, for your technical team, you want to be able to keep all changes under development safely separate from the production versions
by keeping production versions in "hotfix folders" (e.g., "v35") while changes under development are kept in a sibling folder (e.g., "dev").
To make this visually obvious, the text color of an <h1> is made green for dev and blue for production.

## Build
1. `cd` in your terminal to be inside the folder where this README.md exists
1. If there is no node_modules/ sibling folder, run `npm install`
1. Build all the configured sites: `npm run build`
1. Using a browser on the same machine, open `dist/index.html`
