const mPath
        = require("path")
    ,mFs
        = require("fs")
    ,mWebpack
        = require("webpack")
    ,mExec
        = require('child_process').exec
    ,sRelativeFolderpathToConfigOfVersionsAndSites
        = "src/configOfVersionsAndSites/"
    ,asExtensionsOfFilesToImportInGeneratedIndexJs
        = [
            ".css"
        ]
    /*
    ,asExtensionsOfFilesToCopyToProjectsUnderDist
        = [
            ".woff"
            ,".woff2"
            ,".png"
            ,".jpg"
            ,",jpeg"
            ,".gif"
            //,".svg" //Consider inlining to index.js instead using modules/rules/type/"asset/inline"
        ]
    */
    ,sRelativeFolderpathToGeneratedIndexJsFiles
        = "./src/generatedIndexJsFiles"
    ,sFilepathToIndexJsCommonToAllWebsites
        = "./src/index.js"
    ,sFilenameToWriteWebsiteConfigInto
        = "oConfigOfWebsite.json"
    ,sRelativeFolderpathToDist
        = "dist"
    ,sIndentationToAdd
        = "  "
    ;

function fsReadableJson(oJson) {
    return JSON.stringify(oJson, null, sIndentationToAdd);
}
function fsEnsureLeadingDotSlash(sFileOrFolderpath) {
    sFileOrFolderpath
    sFileOrFolderpath || "";
    //Remove any initial dot or forward slash before prepending them.
    sFileOrFolderpath
        = sFileOrFolderpath.replace(
            /^[\.\/]/
            ,""
        );
    sFileOrFolderpath
        = `./${sFileOrFolderpath}`;
    return sFileOrFolderpath;
}
function fsEnsureFolderpathIsRelativeToGeneratedIndexJs(sFileOrFolderpath) {
    sFileOrFolderpath
    sFileOrFolderpath || "";
    sFileOrFolderpath
        = sFileOrFolderpath.replace(
            /^\.?\/?src\//
            ,"../../../"
        );
    return sFileOrFolderpath;
}
//Adapted from https://stackoverflow.com/a/77597572/6856046
function fApplyOverridesToDefaults_destructively({
    oDefaults
    ,oOverrides
}) {
    for (const sProperty_inOverrides in oOverrides) {
        if (oOverrides.hasOwnProperty(sProperty_inOverrides)) {
            if (oDefaults.hasOwnProperty(sProperty_inOverrides)
                && typeof oDefaults[sProperty_inOverrides] === 'object'
                && typeof oOverrides[sProperty_inOverrides] === 'object'
            ) {
                fApplyOverridesToDefaults_destructively({
                    oDefaults: oDefaults[sProperty_inOverrides]
                    ,oOverrides: oOverrides[sProperty_inOverrides]
                });
            } else {
                oDefaults[sProperty_inOverrides]
                    = oOverrides[sProperty_inOverrides];
            }
        }
    }
    //No return statement because this fn destructively modifies oDefaults.
}
function foApplyOverridesToDefaults_nonDestructively({
    oDefaults
    ,oOverrides
}) {
    const oDefaults_deepCopy
        = structuredClone(oDefaults);
    fApplyOverridesToDefaults_destructively({
        oDefaults: oDefaults_deepCopy
        ,oOverrides: oOverrides
    });
    return oDefaults_deepCopy;
}

/* For each "leaf folder" under src/configOfVersionsAndSites/, apply all local overrides onto the defaults encountered while getting here
 * from the root at src/configOfVersionsAndSites/
 *
 * This fn has a similar motivation to https://github.com/survivejs/webpack-merge
 * but also walks a folder tree in order to find _what_ to merge.
 */
function faoIdentifyTheResourcesThatEachIndexJsShouldReferenceByWalkingTheConfigFolder({
    sRelativeFolderpathOfConfigToProcess
    ,oMap_sFilenameExtension_asFilepathsToInclude = {}
    ,aoResourceReferencesForEachIndexJs = []
    ,bProvideLogging = false
    ,sIndentation_current = ""
} = {}) {
    const amDirectoryEntriesToProcess
        = mFs.readdirSync(
            sRelativeFolderpathOfConfigToProcess
            ,{
                withFileTypes: true
            }
        )
        ,asSubfolderNamesToRecurseInto
            = []
        ;
    if (bProvideLogging) {
        console.info(
            `${sIndentation_current}Processing contents of folderpath[${sRelativeFolderpathOfConfigToProcess}]. Found[${amDirectoryEntriesToProcess.length}] items.`
        );
    }
    for (const mDirectoryEntry of amDirectoryEntriesToProcess) {
        if (mDirectoryEntry.isDirectory()) {
            asSubfolderNamesToRecurseInto.push( //We want to walk breadth-first to visit all files before descending into sibling folders.
                mDirectoryEntry.name
            );
        } else if (mDirectoryEntry.isFile()) {
            const sFilenameFound
                    = mDirectoryEntry.name
                ,sExtOfFilename
                    = mPath.extname(sFilenameFound).toLowerCase()
                ,asFilepathToInclude_forThisFileExtension
                    = oMap_sFilenameExtension_asFilepathsToInclude?.[sExtOfFilename]
                ,sFolderpath
                    = mDirectoryEntry.parentPath
                ,sFilepath
                    = mPath.join(
                        mDirectoryEntry.parentPath
                        ,mDirectoryEntry.name
                    )
                ;
            if (bProvideLogging) {
                console.info(
                    `${sIndentation_current}${sIndentationToAdd}Processing file ext[${sExtOfFilename}] name[${sFilenameFound}] path[${sFolderpath}].`
                );
            }
            if (sExtOfFilename === ".json") {
                const oPreviousJson
                        = oMap_sFilenameExtension_asFilepathsToInclude[sExtOfFilename] || {}
                    ,sContentOfFile
                        = mFs.readFileSync(
                            sFilepath
                            ,"utf8" //Ensure we get a string instead of a buffer.
                        )
                    ,oJsonContentOfFile
                        = JSON.parse(sContentOfFile)
                    ;
                if (bProvideLogging) {
                    console.info(
                        `${sIndentation_current}${sIndentationToAdd}${sIndentationToAdd}Merging oPreviousJson:\n${fsReadableJson(oPreviousJson)}`
                    );
                    console.info(
                        `${sIndentation_current}${sIndentationToAdd}${sIndentationToAdd}   oJsonContentOfFile:\n${fsReadableJson(oJsonContentOfFile)}`
                    );
                }
                oMap_sFilenameExtension_asFilepathsToInclude[sExtOfFilename]
                    = foApplyOverridesToDefaults_nonDestructively({
                        oDefaults:      oPreviousJson
                        ,oOverrides:    oJsonContentOfFile
                    });
                if (bProvideLogging) {
                    console.info(
                        `${sIndentation_current}${sIndentationToAdd}${sIndentationToAdd}               result:\n${fsReadableJson(oMap_sFilenameExtension_asFilepathsToInclude[sExtOfFilename])}`
                    );
                }
            } else if (! asFilepathToInclude_forThisFileExtension) {
                oMap_sFilenameExtension_asFilepathsToInclude[sExtOfFilename]
                    = [sFilepath];
            } else {
                oMap_sFilenameExtension_asFilepathsToInclude[sExtOfFilename].push(
                    sFilepath
                );
            }
        }
    }
    if (asSubfolderNamesToRecurseInto.length > 0) {
        for (const sSubfolderNameToRecurseInto of asSubfolderNamesToRecurseInto) {
            const sRelativeFolderpathToRecurseInto
                = mPath.join(
                    sRelativeFolderpathOfConfigToProcess
                    ,sSubfolderNameToRecurseInto
                );
            aoResourceReferencesForEachIndexJs
                = faoIdentifyTheResourcesThatEachIndexJsShouldReferenceByWalkingTheConfigFolder({
                    sRelativeFolderpathOfConfigToProcess:           sRelativeFolderpathToRecurseInto
                    ,oMap_sFilenameExtension_asFilepathsToInclude:  structuredClone(oMap_sFilenameExtension_asFilepathsToInclude)
                    ,aoResourceReferencesForEachIndexJs:            aoResourceReferencesForEachIndexJs
                    ,bProvideLogging:                               bProvideLogging
                    ,sIndentation_current:                          sIndentation_current + sIndentationToAdd
                });
        }
    } else {
        //We have reached a leaf-folder.

        if (bProvideLogging) {
            console.info(
                `${sIndentation_current}${sIndentationToAdd}At leaf, oMap_sFilenameExtension_asFilepathsToInclude:\n${fsReadableJson(oMap_sFilenameExtension_asFilepathsToInclude)}`
            );
        }
        aoResourceReferencesForEachIndexJs.push(
            oMap_sFilenameExtension_asFilepathsToInclude
        );
    }
    return aoResourceReferencesForEachIndexJs;
}

/* Return an object whose property-values are paths to index.js files, as in https://webpack.js.org/concepts/entry-points/#multi-page-application
 */
function foWriteAnIndexJsForEachWebsiteConfigured({
    aoResourceReferencesForEachIndexJs
    ,bProvideLogging = false
} = {}) {
    const oEntries
        = {};
    let sContentOfIndexJsCommonToAllWebsites
        = mFs.readFileSync(
            sFilepathToIndexJsCommonToAllWebsites
            ,"utf8" //Ensure we get a string instead of a buffer.
        );
    if (! aoResourceReferencesForEachIndexJs?.length) {
        if (bProvideLogging) {
            console.warn(
                "No resources were found that could be used to write index.js files."
            );
        }
    } else {
        try {
            //Remove any generated files from any previous run.
            mFs.rmSync(
                sRelativeFolderpathToGeneratedIndexJsFiles
                ,{
                    recursive:  true
                    ,force:     true
                }
            );
        } catch (xErr1) {
            console.warn(
                `When trying to recursively delete folder[${sRelativeFolderpathToGeneratedIndexJsFiles}]: ${xErr1}`
            );
        }
        for (const oResourceReferencesToCreateAnIndexJs of aoResourceReferencesForEachIndexJs) {
            const oConfigOfWebsite
                = oResourceReferencesToCreateAnIndexJs?.[".json"]
            sCluster
                = oConfigOfWebsite?.sCluster
            iProjectCode
                = oConfigOfWebsite?.iProjectCode
            sQueryPathToUseAsKeyInEntries
                = `${sCluster}/${iProjectCode}/`
            sFolderpathToContainTheIndexJs
                = mPath.join(
                    sRelativeFolderpathToGeneratedIndexJsFiles
                    ,sCluster
                    ,iProjectCode.toString()
                )
            sFilepathToGeneratedIndexJs
                = mPath.join(
                    sFolderpathToContainTheIndexJs
                    ,"index.js"
                )
                ;
            mFs.mkdirSync(
                sFolderpathToContainTheIndexJs
                ,{
                    recursive: true //Create the parent directory if it hasn't yet been recreated by an earlier loop in this 'for'.
                }
            );
            //Create the .json that the sibling index.js will import.
            mFs.writeFileSync(
                mPath.join(
                    sFolderpathToContainTheIndexJs
                    ,sFilenameToWriteWebsiteConfigInto
                )
                ,fsReadableJson(
                    oConfigOfWebsite
                )
            );
            let sContentOfIndexJsToReplacePlaceholder
                //Format adapted from https://webpack.js.org/guides/asset-management/#loading-data
                = `import oConfigOfWebsite from "${fsEnsureLeadingDotSlash(sFilenameToWriteWebsiteConfigInto)}";\n`;
            for (const sExt of asExtensionsOfFilesToImportInGeneratedIndexJs) {
                for (const sFilepathToImport of (oResourceReferencesToCreateAnIndexJs?.[sExt] || [])) {
                    sContentOfIndexJsToReplacePlaceholder
                        //Format adapted from https://webpack.js.org/guides/asset-management/#loading-css
                        += `import "${fsEnsureFolderpathIsRelativeToGeneratedIndexJs(sFilepathToImport)}";\n`;
                }
            }
            //Replacee the placeholder import line of the template, which is present just to make the template well-formed when viewed in isolation.
            // To aid readability, we use named capture groups: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_capturing_group
            // For use of named capture groups in replace: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
            sContentOfIndexJsCommonToAllWebsites
                = sContentOfIndexJsCommonToAllWebsites.replace(
                    /^(?<templatePrefixToRetain>(.|\n)*)(?<templateLineToReplace>\/\*This line will be replaced when this file is used as a template.\*\/[^\n]*\n)(?<templateSuffixToRetain>(.|\n)*)$/
                    ,`$<templatePrefixToRetain>${sContentOfIndexJsToReplacePlaceholder}$<templateSuffixToRetain>`
                );

            //Create the index.js.
            mFs.writeFileSync(
                sFilepathToGeneratedIndexJs
                ,sContentOfIndexJsCommonToAllWebsites
            );
            oEntries[sQueryPathToUseAsKeyInEntries]
                = fsEnsureLeadingDotSlash( //mPath.join strips leading ./ but webpack needs them.
                    sFilepathToGeneratedIndexJs
                );
            /*
            //For all files given for this project under /configOfVersionsAndSites that are to be copied instead of imported, do that now.
            for (const sExt of asExtensionsOfFilesToCopyToProjectsUnderDist) {
                for (const sFilepathOfFileToCopy of (oResourceReferencesToCreateAnIndexJs?.[sExt] || [])) {
                    const sFilepathWhereCopyShouldGo
                            = sFilepathOfFileToCopy.replace(
                                sRelativeFolderpathToConfigOfVersionsAndSites
                                ,`${sRelativeFolderpathToDist}/`
                            )
                    if (bProvideLogging) {
                        console.info(
                            `Copying from[${sFilepathOfFileToCopy}]`
                            +`\n          to[${sFilepathWhereCopyShouldGo}].`
                        );
                    }
                    mFs.copyFileSync(
                        sFilepathOfFileToCopy
                        ,sFilepathWhereCopyShouldGo
                    );
                }
            }
            */
        }
    }
    return oEntries;
}


const aoResourceReferencesForEachIndexJs
    = faoIdentifyTheResourcesThatEachIndexJsShouldReferenceByWalkingTheConfigFolder({
        sRelativeFolderpathOfConfigToProcess:
            sRelativeFolderpathToConfigOfVersionsAndSites
        //,bProvideLogging:                       true
    })
    ,oEntries
        = foWriteAnIndexJsForEachWebsiteConfigured({
            aoResourceReferencesForEachIndexJs
            //,bProvideLogging:                       true
        })
    ;
console.info(
    `oEntries:\n${fsReadableJson(oEntries)}`
);
module.exports = {
    entry: oEntries
    ,output: {
        path:               mPath.resolve(__dirname, sRelativeFolderpathToDist)
        ,filename:          "[name][contenthash].js"  //[name] from oEntries is relative folderpath {sCluster}/{sProjectCode}/
        ,sourceMapFilename: "[name][contenthash].map"
        ,chunkFilename:     "[contenthash].js"
        ,clean:             true
    }
    ,mode: "production"
    ,module: {
        rules: [
            {
                test:   /\.css$/i
                ,use:   ['style-loader', 'css-loader']
            }
        ]
    }
    /* ,resolve: {
        fallback: {
            "events": require.resolve("events/")
        }
    } */
    ,devtool: "eval"
    ,plugins: [
        //Avoid run time ReferenceError: process is not defined
        // due to __webpack_unused_export__ = process.env.PACKAGE_VERSION;
        //# sourceURL=webpack://webpackentriesfromsubfolders/../../../node_modules/amazon-kinesis-video-streams-webrtc/lib/index.js?
        // perhaps because we use mode: "production" above.
        //Adapted from https://stackoverflow.com/a/77354539
        // and further adapted from https://webpack.js.org/plugins/environment-plugin/
        new mWebpack.EnvironmentPlugin({
            PACKAGE_VERSION: "This avoids a ReferenceError in amazon-kinesis-video-streams-webrtc when used in a non-React Webpack project."
        })
        ,{ //Adapted from https://stackoverflow.com/a/49786887/6856046
            apply: (mWebpackCompiler1) => {
                mWebpackCompiler1.hooks.afterEmit.tap(
                    'AfterEmitPlugin'
                    ,(mCompilation1) => {
                        const sContentOfTemplateHtmlCommonToAllWebsites
                                = mFs.readFileSync(
                                    "./src/template.html"
                                    ,"utf8" //Ensure we get a string instead of a buffer.
                                )
                            ,sFolderpathToDist
                                = mPath.resolve(__dirname, sRelativeFolderpathToDist);
                        for (const mAsset of mCompilation1.getAssets()) {
                            const sRelativeFilepathOfBundleUnderDist
                                    = mAsset.name
                                ,oPartsOfFilepath //See https://nodejs.org/api/path.html#pathparsepath
                                    = mPath.parse( sRelativeFilepathOfBundleUnderDist )
                                ,sFilenameOfBundle
                                    = oPartsOfFilepath?.base
                                ,sRelativeFolderpathUnderDistToBundle
                                    = oPartsOfFilepath?.dir
                                ,sContentOfIndexHtmlToWrite
                                    = sContentOfTemplateHtmlCommonToAllWebsites.replace(
                                        "REPLACE_WITH_BUNDLE_FILENAME"
                                        ,sFilenameOfBundle
                                    )
                                ;
                            //TODO (Low priority) Html-minify sContentOfIndexHtmlToWrite
                            mFs.writeFileSync(
                                mPath.join(
                                    sFolderpathToDist
                                    ,sRelativeFolderpathUnderDistToBundle
                                    ,"index.html"
                                )
                                ,sContentOfIndexHtmlToWrite
                            );
                        }
                    }
                );
            }
        }
    ]
};
