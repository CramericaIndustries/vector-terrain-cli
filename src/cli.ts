#!/usr/bin/env node
// "#!/usr/bin/env node" allows to run the script like so...
// ./cli.js greet alice
// instead of 
// node cli.js greet alice

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';



yargs(hideBin(process.argv))

  // Use the commands directory to scaffold.
  .commandDir('commands')
  // Enable strict mode.
  .strict()
  // Useful aliases.
  .alias({ h: 'help' })
  .argv;