export const vertexShader = `
in vec3 position;
        void main(){
        gl_Position = vec4(position,1.0);
    }
`;

export const fragmentShader = `
precision highp float;
uniform vec3      u_resolution;
uniform float     u_time;
uniform sampler2D u_noiseTexture;
uniform float u_noiseStrength;
uniform vec2 u_noiseSize;

out vec4 fragColor;

float noise(vec2 x) {
    vec2 f = fract(x);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    vec2 p = floor(x);
    vec2 res = u_noiseSize;

    float a = textureLod(u_noiseTexture, (p + vec2(0.5, 0.5)) / res, 0.0).x;
    float b = textureLod(u_noiseTexture, (p + vec2(1.5, 0.5)) / res, 0.0).x;
    float c = textureLod(u_noiseTexture, (p + vec2(0.5, 1.5)) / res, 0.0).x;
    float d = textureLod(u_noiseTexture, (p + vec2(1.5, 1.5)) / res, 0.0).x;
    float value = a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;

    // 增强噪声才正常
    return value*u_noiseStrength;
}
float fbm(vec2 x, int detail){
    float a = 0.0;
    float b = 1.0;
    float t = 0.0;
    for(int i = 0; i < detail; i++){
        float n = noise(x);
        a += b*n;
        t += b;
        b *= 0.7;
        x *= 2.0; 
    }
    return a/t;
}

float fbm2(vec2 x, int detail){
    float a = 0.0;
    float b = 1.0;
    float t = 0.0;
    for(int i = 0; i < detail; i++){
        float n = noise(x);
        a += b*n;
        t += b;
        b *= 0.9;
        x *= 2.0; 
    }
    return a/t;
}

float box(vec2 uv, float x1, float x2, float y1, float y2){
    return (uv.x > x1 && uv.x < x2 && uv.y > y1 && uv.y < y2)?1.0:0.0;
} 

#define dot2(v) dot(v, v)
#define layer(dh, v)  if (uv.y < h + midlevel - (dh) ) return vec4(v, 1.);

vec4 foreground(vec2 uv, float t){
    float midlevel;
    float h;
    float disp;
    float dist;
    vec2 uv2;
    
    uv.y -= 0.2;
    
    midlevel = -0.1;
    disp = 1.7;
    dist = 1.0;
    uv2 = uv + vec2(t/dist + 40.0, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.12, vec3(0.43, 0.32, 0.31));
    layer(0.08, vec3(0.55, 0.42, 0.41));
    layer(0.04, vec3(0.66, 0.42, 0.40));
    layer(0., vec3(0.77, 0.48, 0.46));
    
    midlevel = 0.05;
    disp = 1.7;
    dist = 2.0;
    uv2 = uv + vec2(t/dist + 38.0, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.1, vec3(0.95, 0.66, 0.48));
    layer(0.04, vec3(0.98, 0.76, 0.64));
    layer(0., vec3(0.95, 0.80, 0.77));
    
    return vec4(0.0); // 修改：未遮挡部分返回透明度为0，用于正确混合
}

vec4 background(vec2 uv, float t){
    float midlevel;
    float h;
    float disp;
    float dist;
    vec2 uv2;
    
    midlevel = 0.3;
    disp = 0.9;
    dist = 10.0;
    uv2 = uv + vec2(t/dist + 32.5, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.14, vec3(0.48, 0.19, 0.20));
    layer(0.1, vec3(0.68, 0.28, 0.19));
    layer(0.07, vec3(0.88, 0.38, 0.24));
    layer(0., vec3(0.95, 0.45, 0.30));
    
    midlevel = 0.35;
    disp = 1.0;
    dist = 15.0;
    uv2 = uv + vec2(t/dist + 30.0, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.04, vec3(0.98, 0.76, 0.64));
    layer(0., vec3(0.95, 0.80, 0.77));
    
    midlevel = 0.35;
    disp = 3.5;
    dist = 20.0;
    uv2 = uv + vec2(t/dist + 27.5, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.12, vec3(0.43, 0.32, 0.31));
    layer(0.08, vec3(0.55, 0.42, 0.41));
    layer(0.04, vec3(0.66, 0.42, 0.40));
    layer(0., vec3(0.77, 0.48, 0.46));
    
    midlevel = 0.45;
    disp = 2.0;
    dist = 25.0;
    uv2 = uv + vec2(t/dist + 23.0, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.04, vec3(0.98, 0.57, 0.36));
    layer(0., vec3(1.0, 0.62, 0.44));
    
    midlevel = 0.5;
    disp = 2.3;
    dist = 30.0;
    uv2 = uv + vec2(t/dist + 20.5, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.12, vec3(0.41, 0.27, 0.27));
    layer(0.08, vec3(0.53, 0.35, 0.32));
    layer(0.04, vec3(0.80, 0.24, 0.17));
    layer(0., vec3(0.99, 0.29, 0.20));
    
    midlevel = 0.5;
    disp = 2.5;
    dist = 35.0;
    uv2 = uv + vec2(t/dist + 18.0, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.1, vec3(0.88, 0.38, 0.24));
    layer(0.05, vec3(0.98, 0.42, 0.28));
    layer(0., vec3(1.0, 0.48, 0.35));
    
    midlevel = 0.6;
    disp = 2.0;
    dist = 40.0;
    uv2 = uv + vec2(t/dist + 18.0, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.1, vec3(0.95, 0.66, 0.48));
    layer(0., vec3(1.0, 0.76, 0.60));
    
    midlevel = 0.75;
    disp = 3.5;
    dist = 45.0;
    uv2 = uv + vec2(t/dist + 15.5, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.2, vec3(1.0, 0.55, 0.33));
    layer(0.15, vec3(0.98, 0.50, 0.24));
    layer(0.1, vec3(0.90, 0.55, 0.40));
    layer(0., vec3(1.0, 0.62, 0.44));
    
    midlevel = 0.7;
    disp = 2.7;
    dist = 50.0;
    uv2 = uv + vec2(t/dist + 12.0, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.04, vec3(0.73, 0.36, 0.30));
    layer(0., vec3(0.80, 0.40, 0.34));
    
    midlevel = 0.8;
    disp = 2.7;
    dist = 60.0;
    uv2 = uv + vec2(t/dist + 9.5, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.1, vec3(0.93, 0.58, 0.35));
    layer(0., vec3(1.0, 0.76, 0.60));
    
    midlevel = 0.9;
    disp = 3.0;
    dist = 70.0;
    uv2 = uv + vec2(t/dist + 7.0, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.1, vec3(0.56, 0.25, 0.22));
    layer(0.05, vec3(0.60, 0.30, 0.27));
    layer(0., vec3(0.74, 0.35, 0.30));
    
    midlevel = 1.0;
    disp = 5.0;
    dist = 100.0;
    uv2 = uv + vec2(t/dist + 3.5, 0.0);
    h = (fbm(uv2, 8) - 0.5)*disp;
    layer(0.1, vec3(0.92, 0.85, 0.82));
    layer(0., vec3(1.0, 0.94, 0.91));
    
    return vec4(0.58, 0.7, 1.0, 1.);
}
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 screenUV = fragCoord / u_resolution.xy;
    vec2 uv = fragCoord / u_resolution.y;
    float t = u_time * 4.0;
    
    // -------------------------------------------------------------
    // 1. 基础画面绘制：计算出 100% 正常、明亮的当前帧底色
    // -------------------------------------------------------------
    vec3 currentFrameColor = vec3(0.0);
    
    // A. 渲染背景
    currentFrameColor = background(uv, t).rgb;
    
    // B. 渲染火车及轨道相关的几何图层
    float k;
    float h;
    float disp;
    float dist;
    vec2 uv2;
    
    vec2 trainUV = uv;
    trainUV.y -= 0.2;

    k = 1.0;
    uv2 = fract(trainUV * 9.0);
    float wagon = 1.0;
    wagon *= 1.0 - step(0.45, trainUV.x);
    wagon *= 1.0 - step(0.115, trainUV.y);
    wagon *= step(0.103, trainUV.y);
    wagon *= step(0.05, 1.0 - abs(uv2.x * 2.0 - 1.0));
    
    float join = 1.0;  
    join *= 1.0 - step(0.45, trainUV.x);
    join *= 1.0 - step(0.11, trainUV.y);
    join *= step(0.107, trainUV.y);
    
    float roof = 1.0;
    roof *= 1.0 - step(0.45, trainUV.x);
    roof *= 1.0 - step(0.117, trainUV.y);
    roof *= step(0.11, trainUV.y);
    roof *= step(0.15, 1.0 - abs(uv2.x * 2.0 - 1.0));
    
    float loco = box(trainUV, 0.45, 0.5, 0.103, 0.112);
    float chem1 = box(trainUV, 0.49, 0.495, 0.103, 0.12);
    float chem2 = box(trainUV, 0.488, 0.496, 0.12, 0.123);
    float locoRoof = box(trainUV, 0.443, 0.47, 0.11, 0.117);
    
    float wheel = 1.0 - step(0.00004, dot2(trainUV - vec2(0.457, 0.106)));
    wheel += 1.0 - step(0.00002, dot2(trainUV - vec2(0.487, 0.105)));
    wheel += 1.0 - step(0.00002, dot2(trainUV - vec2(0.497, 0.105)));
    
    if (trainUV.x < 0.45 && trainUV.y > 0.025 && trainUV.y < 0.2){
        wheel += 1.0 - step(0.002, dot2(uv2 - vec2(0.2, 0.95)));
        wheel += 1.0 - step(0.002, dot2(uv2 - vec2(0.8, 0.95)));
    }
    
    currentFrameColor = mix(currentFrameColor, vec3(0.18, 0.12, 0.15), join);
    currentFrameColor = mix(currentFrameColor, vec3(0.48, 0.19, 0.20), wagon);
    currentFrameColor = mix(currentFrameColor, vec3(0.18, 0.12, 0.15), roof);
    
    currentFrameColor = mix(currentFrameColor, vec3(0.38, 0.19, 0.20), loco);
    currentFrameColor = mix(currentFrameColor, vec3(0.38, 0.19, 0.20), chem1);
    currentFrameColor = mix(currentFrameColor, vec3(0.18, 0.12, 0.15), locoRoof);
    currentFrameColor = mix(currentFrameColor, vec3(0.18, 0.12, 0.15), chem2 + wheel);

    // C. 渲染火车烟雾
    dist = 5.0;
    uv2 = trainUV + vec2(t / dist + 3.5, 0.0);
    uv2.x -= t / dist * 0.2;
    h = fbm2(uv2, 8) - 0.55;
    
    if(trainUV.x < 0.49){
        float x = -trainUV.x + 0.49;
        float y = abs(trainUV.y + h * 0.4 - 0.16 * sqrt(x) - 0.12) - 0.8 * x * exp(-x * 10.0);
        if(y < 0.0)  currentFrameColor = vec3(1.0, 0.94, 0.91);
        if(y < -0.02) currentFrameColor = vec3(0.92, 0.85, 0.82);
    }
    
    // D. 大桥渲染
    dist = 5.0;
    uv2 = trainUV + vec2(t / dist + 32.5, 0.0);
    uv2.x = fract(uv2.x * 3.0);
    k = 1.0;
    k *= smoothstep(0.001, 0.003, abs(uv2.y - pow(uv2.x - 0.5, 2.0) * 0.15 - 0.12));
    k *= min(step(0.05, 1.0 - abs(uv2.x * 2.0 - 1.0)) + step(0.17, uv2.y), 1.0);
    k *= min(smoothstep(0.02, 0.05, 1.0 - abs(uv2.x * 2.0 - 1.0)) + step(0.177, uv2.y), 1.0);
    k *= min(step(0.1, uv2.y) + smoothstep(-0.09, -0.085, -uv2.y - 0.001 / (1.0 - abs(uv2.x * 2.0 - 1.0))), 1.0);
    k *= min(smoothstep(0.05, 0.2, 1.0 - abs(fract(uv2.x * 16.0) * 2.0 - 1.0)) + step(0.12, uv2.y - pow(uv2.x - 0.5, 2.0) * 0.15) + step(-0.1, -uv2.y), 1.0);
    currentFrameColor = mix(vec3(0.29, 0.09, 0.08) * smoothstep(-0.08, 0.08, trainUV.y), currentFrameColor, k);

    // E. 多重采样渲染动态前景
    vec4 fgAccum = vec4(0.0);
    int samples = 5;
    if (uv.y < 0.5) { 
        for (int i = 0; i < samples; i++){
            vec4 fgSample = foreground(uv, t + 4.0 * float(i) / float(samples) / 60.0);
            if(fgSample.a > 0.0) {
                fgAccum.rgb += fgSample.rgb;
                fgAccum.a += 1.0;
            }
        }
        if(fgAccum.a > 0.0) {
            fgAccum.rgb /= fgAccum.a;
            fgAccum.a = clamp(fgAccum.a / float(samples), 0.0, 1.0);
            currentFrameColor = mix(currentFrameColor, fgAccum.rgb, fgAccum.a);
        }
    }

    // -------------------------------------------------------------
    // 2. 最终输出位置：叠加一层电影级暗角特效
    // -------------------------------------------------------------
    // 计算暗角基本系数 (基于屏幕归一化坐标 screenUV)
    float vignette = 16.0 * screenUV.x * screenUV.y * (1.0 - screenUV.x) * (1.0 - screenUV.y);
    
    // vignetteFactor 在屏幕中心为 1.0 (保持完全明亮)，边缘平滑过渡到约 0.5
    float vignetteFactor = 0.5 + 0.5 * pow(vignette, 0.25);
    
    // 直接在最终输出叠加暗角。画面依然通透，只有四周边缘带有温和的胶片暗角效果
    fragColor = vec4(currentFrameColor * vignetteFactor, 1.0);
}
    void main() {
        mainImage(fragColor, gl_FragCoord.xy);
    }
`;
