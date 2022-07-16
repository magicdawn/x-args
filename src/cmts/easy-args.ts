import yargs, { CommandModule } from 'yargs'

// 'array': synonymous for array: true, see array()
// 'boolean': synonymous for boolean: true, see boolean()
// 'count': synonymous for count: true, see count()
// 'number': synonymous for number: true, see number()
// 'string': synonymous for string: true, see string()

type TypeText = 'array' | 'boolean' | 'count' | 'number' | 'string'

type ToExclude =
	//
	| 'type'
	// specific types
	| TypeText
	// posible values
	| 'default' | 'choices'

type CommonOptions = Omit<yargs.Options, ToExclude>

type Options<T> = CommonOptions & {
	default?: T
	choices?: T[]
}

type OptionsString = Options<string>

const isOption = Symbol('options')
const defineCommonOption = <T extends TypeText, V>(name: string, options: Options<V>) => {
	return { [isOption]: true, name, options: { ...options, type: 'string' } } as unknown as V | undefined
}

type DefineCommon<T extends TypeText, V> = typeof defineCommonOption<T, V>
const defineStringOption: DefineCommon<'string', string> = defineCommonOption
const defineBooleanOption: DefineCommon<'boolean', boolean> = defineCommonOption
const defineNumberOption: DefineCommon<'number', number> = defineCommonOption

// complex
const defineArrayOption = (name: string, options: CommonOptions) => {
	return { [isOption]: true, name, options: { ...options, type: 'array' } } as unknown as string[]
}

// -v 	=>	v=1
// -vv 	=> 	v=2
// -vvv => 	v=3
const defineCountOption = (name: string, options: CommonOptions) => {
	return { [isOption]: true, name, options: { ...options, type: 'count' } } as unknown as number
}

class EOption {
	static string = defineStringOption
	static number = defineNumberOption
	static boolean = defineBooleanOption
	static array = defineArrayOption
	static count = defineCountOption
}

class EPositional {
	static string = defineStringOption
	static number = defineNumberOption
}

abstract class ECommand {
	// string (or array of strings) that executes this command when given on the command line, first string may contain positional args
	abstract command: string | string[]
	// array of strings (or a single string) representing aliases of exports.command, positional args defined in an alias are ignored
	abstract aliases?: string[] | string
	// string used as the description for the command in help text, use false for a hidden command
	abstract describe?: string
	// a boolean (or string) to show deprecation notice.
	abstract deprecated?: string | boolean
	// subcommands of this command
	abstract subcommands?: Array<ECommand | CommandModule>

	abstract run(): Promise<void> | void

	private readonly C!: typeof ECommand
	constructor() {
		// @ts-ignore
		this.C = this.constructor
	}

	optionPairs: [fieldName: string | symbol, argvName: string][] = []
	positionalPairs: [fieldName: string | symbol, argvName: string][] = []

	transform() {
		this.optionPairs = []
		this.positionalPairs = []

		return {
			command: this.command,
			aliases: this.aliases,
			describe: this.describe,
			deprecated: this.deprecated,

			builder: (yargs) => {
				// subcommands
				; (this.subcommands || []).map(c => {
					if (c instanceof ECommand) return c.transform()
					else return c
				}).forEach(c => {
					yargs = yargs.command(c)
				})

				// positions arguments
				// Reflect.ownKeys(this).forEach(k => {
				// 	if (this[k]?.[isOption]) {
				// 		// add 1 option
				// 		const { name, options } = this[k]
				// 		yargs = yargs.option(name, options)

				// 		// connect
				// 		optionPairs.push([k, name])
				// 	}
				// })

				// options
				Reflect.ownKeys(this).forEach(k => {
					if (this[k]?.[isOption]) {
						// add 1 option
						const { name, options } = this[k]
						yargs = yargs.option(name, options)

						// connect
						this.optionPairs.push([k, name])
					}
				})





				return yargs
			},

			handler: (argv) => {
				// attach value
				for (let [fieldName, argvName] of this.optionPairs) {
					this[fieldName] = argv[argvName]
				}
				for (let [fieldName, argvName] of this.positionalPairs) {
					this[fieldName] = argv[argvName]
				}
				return this.run()
			}
		} as CommandModule
	}

}



class TeaCommand extends ECommand {
	describe?: string
	deprecated?: string | boolean
	subcommands?: (ECommand | yargs.CommandModule<{}, {}>)[]
	command: string | string[] = 'tea'
	aliases?: string | string[] = 't'


	yes = EOption.boolean('yes', { alias: 'y', default: true })

	quality = EOption.number('quality', { describe: '质量塞', alias: ['q'], choices: [120, 240, 360] })

	async run() {
		console.log(this);
	}
}

const argv = yargs
	.command(new TeaCommand().transform())
	.help()
	.argv



console.log(argv);
