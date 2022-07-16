// const commander = require('commander'); // (normal include)
// const commander = require('../') // include commander in git clone of commander repo

import commander, { Command, Option } from 'commander'
const program = new Command()

import yargs, { CommandModule } from 'yargs'

// Commander supports nested subcommands.
// .command() can add a subcommand with an action handler or an executable.
// .addCommand() adds a prepared command with an action handler.

// Add nested commands using `.command()`.


type T = Exclude<yargs.Options, 'type' | 'default'>
const defineString = (name: string, options: T & { default?: string }) => {
	return { name, options }
}


const brew = program.command('brew')
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
program.addCommand(makeHeatCommand())

// debugger
// console.log(program)



// Try the following:
//    node nestedCommands.js brew tea
//    node nestedCommands.js heat jug


abstract class BaseCommand {
	abstract run(): Promise<void> | void
	abstract subcommands?: Array<BaseCommand | Command>

	// command name
	static cname: string
	static aliases?: string[]

	private readonly C!: typeof BaseCommand

	constructor() {
		// @ts-ignore
		this.C = this.constructor
	}

	toYargsCmd() {
		return {
			command: this.C.cname,
			aliases: this.C.aliases || [],

			builder(yargs) {
				return yargs
			},

			handler(argv) {
				// attach value

				return this.run()
			}
		} as CommandModule
	}

	toRaw() {
		const cmd = new Command(this.C.cname)
		if (this.C.aliases?.length) {
			cmd.aliases(this.C.aliases)
		}

		// options
		Reflect.ownKeys(this).forEach(k => {
			if (this[k]?.[OptSymbol]) {
				console.log(k);

				const { flags, description, required, default: defaultValue } = this[k]

				// cmd.option(flags, description, defaultValue)

				const opt = new Option(flags, description)
				opt.default(defaultValue)
				cmd.addOption(opt)

				this[k].opt = opt
			}
		})

		// sub commands
		this.subcommands.forEach((subcommand) => {
			cmd.addCommand(subcommand instanceof BaseCommand ? subcommand.toRaw() : subcommand)
		})

		cmd.action((options) => {
			console.log(options);
			Object.assign(this, options)




			return this.run()
		})

		return cmd
	}
}

interface OptMeta<T> {
	description?: string
	default?: T
	required?: boolean
}

const OptSymbol = Symbol('opt')

function defineOpt<V>(flags: string, meta?: OptMeta<V>): V {
	// lie like Clipanion
	return { [OptSymbol]: true, flags, ...meta } as unknown as V
}

// prettier-ignore
type DefineOpt<T> = typeof defineOpt<T>

class Opts {
	static string: DefineOpt<string> = defineOpt
	static boolean: DefineOpt<boolean> = defineOpt
	static number: DefineOpt<number> = defineOpt
	static float: DefineOpt<number> = defineOpt
	static int: DefineOpt<number> = defineOpt
}

class TeaCommand extends BaseCommand {
	static cname = 'tea'
	static aliases = ['t']

	flag = Opts.string('-x,--xyz', { description: 'xxx', default: 'xyz' })

	subcommands = []

	run() {
		console.log(this.flag);
	}
}

interface DefineCommandOptions {
	name: string
	alias?: string[] | string
	options: any
}

export function defineCommand(options: DefineCommandOptions) {
	const cmd = new Command(options.name)
	return cmd
}

const cmd = defineCommand({
	name: 'tea',
	alias: ['t'],

	options: [
		// .option('-d, --debug', 'output extra debugging')
		// .option('-s, --small', 'small pizza size')
		// .option('-p, --pizza-type <type>', 'flavour of pizza');
		'-r, --required',
		new Option('-f, --flag', 'desc').default(true),
		//
	],
})


program.addCommand(new TeaCommand().toRaw())
program.parse(process.argv)
