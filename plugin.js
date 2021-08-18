"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var webpack = __importStar(require("webpack"));
var DeclarationBundlerPlugin = /** @class */ (function () {
    function DeclarationBundlerPlugin(options) {
        if (options === void 0) { options = {}; }
        this.out = options.out ? options.out : './build/';
        this.excludedReferences = options.excludedReferences ? options.excludedReferences : undefined;
        if (!options.moduleName) {
            throw new Error('please set a moduleName if you use mode:internal. new DeclarationBundlerPlugin({mode:\'internal\',moduleName:...})');
        }
        this.moduleName = options.moduleName;
    }
    DeclarationBundlerPlugin.prototype.apply = function (compiler) {
        var _this = this;
        //when the compiler is ready to emit files
        compiler.hooks.emit.tapAsync('DeclarationBundlerPlugin', function (compilation, callback) {
            compilation.hooks.processAssets.tap({
                name: 'DeclarationBundlerPlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                additionalAssets: true
            }, function (assets) {
                //collect all generated declaration files
                //and remove them from the assets that will be emitted
                var declarationFiles = {};
                for (var filename in assets) {
                    if (filename.indexOf('.d.ts') !== -1) {
                        declarationFiles[filename] = assets[filename];
                        delete assets[filename];
                    }
                }
                //combine them into one declaration file
                var combinedDeclaration = _this.generateCombinedDeclaration(declarationFiles);
                //and insert that back into the assets
                assets[_this.out] = {
                    source: function () {
                        return combinedDeclaration;
                    },
                    size: function () {
                        return combinedDeclaration.length;
                    },
                    map: function () {
                        return {};
                    },
                    updateHash: function () { },
                    buffer: function () {
                        return Buffer.from(combinedDeclaration);
                    },
                    sourceAndMap: function () {
                        return {
                            map: {},
                            source: combinedDeclaration
                        };
                    }
                };
                //webpack may continue now
                callback();
            });
        });
    };
    DeclarationBundlerPlugin.prototype.generateCombinedDeclaration = function (declarationFiles) {
        var declarations = '';
        for (var fileName in declarationFiles) {
            var declarationFile = declarationFiles[fileName];
            // The lines of the files now come as a Function inside declaration file.
            var data = declarationFile.source();
            var lines = data.split("\n");
            var i = lines.length;
            while (i--) {
                var line = lines[i];
                //exclude empty lines
                var excludeLine = line == "";
                //exclude export statements
                excludeLine = excludeLine || line.indexOf("export =") !== -1;
                //exclude import statements
                excludeLine = excludeLine || (/import ([a-z0-9A-Z_-]+) = require\(/).test(line);
                //if defined, check for excluded references
                if (!excludeLine && this.excludedReferences && line.indexOf("<reference") !== -1) {
                    excludeLine = this.excludedReferences.some(function (reference) { return line.indexOf(reference) !== -1; });
                }
                if (excludeLine) {
                    lines.splice(i, 1);
                }
                else {
                    if (line.indexOf("declare ") !== -1) {
                        lines[i] = line.replace("declare ", "");
                    }
                    //add tab
                    lines[i] = "\t" + lines[i];
                }
            }
            declarations += lines.join("\n") + "\n\n";
        }
        var output = "declare module " + this.moduleName + "\n{\n" + declarations + "}";
        return output;
    };
    return DeclarationBundlerPlugin;
}());
module.exports = DeclarationBundlerPlugin;
