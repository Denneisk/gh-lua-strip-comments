const core = require("@actions/core")
const proc = require("process")
const path = require("path")
const fsp = require("fs").promises

// lol
const STRING_OR_COMMENT = /(([\'\"])|(?:\[(?:(=*)\[(?:.|\n)*?)\]\3\])+).*?\2|((?:--(?:\[(?:(=*)\[(?:.|\n)*?)\]\5\])+))|(--.*)/g
const STRING_OR_COMMENT_C = /(([\'\"])|(?:\[(?:(=*)\[(?:.|\n)*?)\]\3\])+).*?\2|((?:--(?:\[(?:(=*)\[(?:.|\n)*?)\]\5\])+))|(--.*)|(\/\/.*)|(\/\*(?:.|\n)*?\*\/)/g

let method = STRING_OR_COMMENT

function parse_lua_comments(str) {
	return str.replace(method, (cap) => {
		if (cap.match(/^([\/-])/)) {
			return "" + "\n".repeat((cap.match(/\n/g) || []).length)
		}
		return cap
	})
}

async function open_and_rewrite_file(file) {
	let handle = await fsp.open(file, "r+")
	if (handle) {
		console.log("Rewriting " + file)
		const data = await handle.readFile("utf8")
		await handle.truncate()
		await handle.write(parse_lua_comments(data), 0)
		await handle.close()
	}
}

async function main() {
	const dir = path.join(process.cwd(), core.getInput("path"))
	
	if (core.getInput("include-c-style")) {
		method = STRING_OR_COMMENT_C
	}
	
	console.log("Removing comments in Lua files at " + dir)
	
	const files = await fsp.readdir(dir, { recursive: true, withFileTypes: true })
	for (const f of files) {
		if (f.isFile() && f.name.endsWith(".lua")) {
			await open_and_rewrite_file(path.join(f.parentPath, f.name))
		}
	}
}

main().catch(err => {
  core.setFailed(`Failed to strip comments: ${err}`);
})