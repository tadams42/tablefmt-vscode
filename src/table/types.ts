export type OutputStyle =
  | 'github'
  | 'psql'
  | 'asciidoc'
  | 'jira'
  | 'rst'
  | 'rst-grid'
  | 'orgtbl'
  | 'ascii'
  | 'modern'
  | 'sharp'
  | 'extended'
  | 'heavy-outline';

export const ALL_STYLES: OutputStyle[] = [
  'github', 'psql', 'asciidoc', 'jira', 'rst', 'rst-grid',
  'orgtbl', 'ascii', 'modern', 'sharp', 'extended', 'heavy-outline',
];
