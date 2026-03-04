// Allows TypeScript to accept `import migration from './0000_curvy_starjammers.sql'`
// babel-plugin-inline-import transforms these to raw strings at build time
declare module '*.sql' {
  const content: string;
  export default content;
}
