import commander, { Command, Option } from 'commander'
const cli = new Command()

// Commander supports nested subcommands.
// .command() can add a subcommand with an action handler or an executable.
// .addCommand() adds a prepared command with an action handler.

// files = Option.String('-f,--files', {
// 	required: true,
// 	description: 'files as input',
// })
// ignoreCase = Option.Boolean('--ignore-case', true, {
// 	description: 'ignore case for -f,--files, default true',
// })
// globCwd = Option.String('--glob-cwd', {
// 	description: 'cwd used in glob',
// })

// // for safty
// yes = Option.Boolean('-y,--yes', false, {
// 	description: 'exec commands, default false(only preview commands, aka dry run)',
// })

// // for tokens
// showTokens = Option.Boolean('-t,--tokens,--show-tokens', false, {
// 	description: 'show available tokens',
// })

cli
  .option('-f,--files <files>', 'files as input')
  .option('--ignore-case', 'ignore case for -f,--files, default true', true)
  .option('--glob-cwd', 'cwd used in glob')
  .option('-t,--tokens,--show-tokens', 'show available tokens', false)
  .option('-c,--command [command]', 'commands to exec')
  .option('-y,--yes', 'exec commands, default false(only preview commands, aka dry run)', false)
  .action((options, cmd) => {
    console.log(options)
    console.log(cmd)
  })

// Add nested commands using `.command()`.
const brew = cli.command('brew')
brew
  .command('tea')
  .option('-x,--xyz')
  .action((options) => {
    console.log('brew tea')
  })
brew.command('coffee').action(() => {
  console.log('brew coffee')
})

// Add nested commands using `.addCommand().
// The command could be created separately in another module.
function makeHeatCommand() {
  const heat = new commander.Command('heat')
  heat.command('jug').action(() => {
    console.log('heat jug')
  })
  heat.command('pot').action(() => {
    console.log('heat pot')
  })
  return heat
}
cli.addCommand(makeHeatCommand())

// debugger
// console.log(cli)

cli.parse(process.argv)
