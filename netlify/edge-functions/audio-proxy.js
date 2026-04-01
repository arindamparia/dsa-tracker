const AUDIO_URLS = {
  healingSound:   'https://res.cloudinary.com/dnju7wfma/video/upload/v1774780549/HealingSound.mp3',
  mandirWinds:    'https://res.cloudinary.com/dnju7wfma/video/upload/v1774779620/Winds_Through_the_Old_Mandir_Flute___Sitar_in_Timeless_Tranquility_MP3_160K_llh2me.mp3',
  shivaMeditation:'https://res.cloudinary.com/dnju7wfma/video/upload/v1774779618/SHIVA___Beautiful_Indian_Background_Music___Deep___Mystical_Meditation_Music___Ambient_Hindu_Music_MP3_160K_sgrn1q.mp3',
  meditation:     'https://res.cloudinary.com/dnju7wfma/video/upload/v1774774806/Temple_Rhythms_Tabla__Flute___Sitar_Tranquility___1_Hour_Indian_Meditation_Music_MP3_160K_aspm1l.mp3',
  krishnaFlute:   'https://res.cloudinary.com/dnju7wfma/video/upload/v1774779598/Flute_of_Peace___Shri_Krishna_Relaxing_Instrumental_MP3_160K_ugj3b0.mp3',
  rain:           'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/rain_fe6smc.mp3',
  rain2:          'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/rain2_uycmn6.mp3',
  ocean:          'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378668/ocean_gzek2u.mp3',
  forest:         'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/forest_l804pd.mp3',
  forest2:        'https://res.cloudinary.com/dnju7wfma/video/upload/v1774382236/forest2_xg9jbw.mp3',
  forest3:        'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/forest3_xlypzq.mp3',
  river:          'https://res.cloudinary.com/dnju7wfma/video/upload/v1774382577/river_ffhhlr.mp3',
};

export default async (request, context) => {
  const url = new URL(request.url);
  const track = url.searchParams.get("track");

  // Basic Anti-Hotlinking: Only allow requests from our site's referer or fetch-site
  const referer = request.headers.get("referer") || "";
  const fetchSite = request.headers.get("sec-fetch-site") || "";

  // Require same-origin or localhost/algotracker referer
  const isAllowedHost = referer.includes("localhost") || referer.includes("algotracker.xyz");
  const isCrossSiteOrDirect = fetchSite === "cross-site" || fetchSite === "none";
  
  if (!isAllowedHost && isCrossSiteOrDirect) {
     return new Response("Forbidden. Audio streaming is securely restricted to algotracker.xyz.", { status: 403 });
  }

  const audioUrl = AUDIO_URLS[track];
  if (!audioUrl) return new Response("Track not found", { status: 404 });

  // Stream exactly what Cloudinary sends us (including range requests for browser seeking!)
  const fetchHeaders = new Headers(request.headers);
  // Strip out host and origin to prevent cloudinary CORS rejection
  fetchHeaders.delete("host"); 
  fetchHeaders.delete("origin");
  fetchHeaders.delete("referer");

  const cloudinaryResponse = await fetch(audioUrl, {
    headers: fetchHeaders,
  });

  return new Response(cloudinaryResponse.body, {
    status: cloudinaryResponse.status,
    statusText: cloudinaryResponse.statusText,
    headers: cloudinaryResponse.headers
  });
};

export const config = { path: "/api/audio" };
