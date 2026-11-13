# MODELS — where every 3D object comes from

The plan was: Higgsfield `generate_image` (studio product shot) → Higgsfield `generate_3d` (.glb) →
`gltf-transform` (Draco + resized textures) → `/public/models`.

**That pipeline could not run**: the Higgsfield account had 0 credits (free plan), so no product shots
and no generated meshes exist. Following the fallback rule in the brief ("if a model looks bad, build
it procedurally in Three.js instead"), the objects were built procedurally, which also gives clean,
separately addressable parts for the exploded views.

| Object      | Source                                   | File                              | Notes |
| ----------- | ---------------------------------------- | --------------------------------- | ----- |
| Watch       | Procedural (Three.js)                    | `src/three/WatchModel.tsx`        | 9 separable parts: strap, case + crown, main plate + barrel, gear train + balance, bridges + jewels, dial, hands, bezel, crystal. Gears are generated tooth-by-tooth and extruded; case, bezel and crystal are lathed profiles. Hands show live IST. Reused in Contact. |
