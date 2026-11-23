import * as THREE_MODULE from "three";

export function makeMat({
    map = null,
    color = 0xffffff,
    transparent = true,
    vertexColors = true,
    sizeAttenuation = true,
    alphaSupport = false,
    clipBandWidth = 0,
    vClipSlope = 0,
    clipFrontZ = 0.1,
    blending = (window.THREE ? window.THREE.NormalBlending : 1),
    opacity = 1,
    depthWrite = true,
} = {}) {
    const T = window.THREE || THREE_MODULE;
    const material = new T.PointsMaterial({
        map, color, transparent, vertexColors, sizeAttenuation,
        blending: blending ?? (T ? T.NormalBlending : 1), opacity, depthWrite,
    });
    material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
            "uniform float size;",
            "attribute float size;" +
            (alphaSupport ? "\nattribute float alpha;\nvarying float vAlpha;" : "") +
            (clipBandWidth > 0 || vClipSlope > 0 ? "\nvarying vec3 vViewPos;" : "")
        );
        let vertexShaderAddition = "";
        if (clipBandWidth > 0 || vClipSlope > 0) vertexShaderAddition += "  vViewPos = mvPosition.xyz;\n";
        if (alphaSupport) vertexShaderAddition += "  vAlpha = alpha;\n";
        if (vertexShaderAddition) {
            shader.vertexShader = shader.vertexShader.replace(
                "#include <project_vertex>",
                "#include <project_vertex>\n" + vertexShaderAddition
            );
        }
        if (alphaSupport) {
            shader.fragmentShader = shader.fragmentShader
                .replace("void main() {", "varying float vAlpha;\nvoid main() {")
                .replace(
                    "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
                    "gl_FragColor = vec4( outgoingLight, diffuseColor.a * vAlpha );"
                );
        }
        if (clipBandWidth > 0 || vClipSlope > 0) {
            shader.fragmentShader = shader.fragmentShader.replace(
                "void main() {",
                "varying vec3 vViewPos;\nvoid main() {"
            );
            let clippingCode = "";
            if (clipBandWidth > 0) {
                clippingCode += "\n  if (vViewPos.z < -" + clipBandWidth.toFixed(3) +
                    " && abs(vViewPos.x) < " + clipFrontZ.toFixed(3) + ") discard;";
            }
            if (vClipSlope > 0) {
                clippingCode += "if (abs(vViewPos.x) < " + clipFrontZ.toFixed(3) +
                    " && vViewPos.z < -" + vClipSlope.toFixed(3) + " * (-vViewPos.z)) discard;";
            }
            const insertionPoint = alphaSupport
                ? "gl_FragColor = vec4( outgoingLight, diffuseColor.a * vAlpha );"
                : "gl_FragColor = vec4( outgoingLight, diffuseColor.a );";
            if (clippingCode) {
                shader.fragmentShader = shader.fragmentShader.replace(
                    insertionPoint, clippingCode + "\n  " + insertionPoint
                );
            }
        }
    };
    return material;
}

export default makeMat;
