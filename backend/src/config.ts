export const config = {
  port: Number(process.env.PORT ?? 3333),

  olhoVivo: {
    token: process.env.OLHOVIVO_TOKEN ?? '',
    baseUrl: (process.env.OLHOVIVO_BASE_URL ?? 'http://api.olhovivo.sptrans.com.br/v2.1').replace(/\/$/, ''),
  },

  trilhosAgoraApiKey: process.env.TRILHOS_API_KEY ?? '',

  geocoding: (process.env.GEOCODING ?? 'on').toLowerCase() !== 'off',
  collector: (process.env.COLLECTOR ?? 'off').toLowerCase() === 'on',

  planner: (process.env.PLANNER ?? 'builtin').toLowerCase() === 'otp' ? ('otp' as const) : ('builtin' as const),
  otpUrl: (process.env.OTP_URL ?? 'http://localhost:8080/otp/routers/default').replace(/\/$/, ''),
};
