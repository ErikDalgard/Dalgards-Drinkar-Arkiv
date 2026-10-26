declare module "cloudflare:test" {
  interface ProvidedEnv { DB: D1Database; MEDIA: R2Bucket; ADMIN_KEY: string; }
}

declare module '*?raw' {
  const content: string;
  export default content;
}
