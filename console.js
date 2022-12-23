/*!
 * MiniConsole
 * v1.5
 * Useful for debugging Javascript on iOS devices without
 * a full set of developer tools.
 * NOT designed for production sites. For development only.
 * 
 * NOTE: This hijacks the browser's default console.log()
 *       functions, so when this is in use, you won't see
 *       anything in the browser's normal dev tools console,
 * 		 if it has one.
 */

// Yes, document.write() is an old, clunky way of getting content
// onto a page, but in this case it's the easiest and most
// maintainable way to embed all the following quickly.
document.write(`
	<h3 style="margin-bottom: 8px">Console</h3>
	<div id="js-console"></div>
	<form action="#" onsubmit="console.runCommand(this.commandBox.value); this.commandBox.value=''; console.scrollWindow(); return false;">
		<input id="commandBox" type="text" onkeydown="console.onKeyPress(event)" onchange="console.previewCommand(this.value)">
	</form>
	<style>
		#js-console, #js-console * {
			box-sizing: border-box;
		}
		#js-console > div {
			border: 1px solid #ddd;
			background-color: #f0f0f0;
			font-family: monospace;
			padding: 7px 12px;
			margin-top: -1px;
		}
		#js-console .log { 
			white-space: pre-wrap; 
			overflow-x: auto;
		}
		#js-console .warn { background: #ffffcc; }
		#js-console .error { background: #ffdddd; }
		#js-console + form input {
			width: 100%;
			font: 10pt monospace;
			padding: 7px 12px;
			border-radius: 0;
		}
		#js-console .prefix { 
			display: inline-block;
			/* display: block; */
			min-width: 8em;
			margin-right: 2em;
			opacity: 0.33; 
		}
	</style>
`);

let consoleDiv = document.getElementById('js-console');

// If the browser doesn't already have a console object, create an empty one
console = console || {};

// We'll keep an array of past commands, which can be recalled using
// up and down arrows
console.commandHistory = [];
console.commandHistory.cursor = null;
console.commandHistory.getPrev = function() {
	if (this.cursor === null)
		this.cursor = this.length;
	this.cursor = this.cursor-1;
	return this[this.cursor];
}
console.commandHistory.getNext = function() {
	this.cursor++;
	if (this.cursor >= this.length) {
		this.cursor = this.length;
		return '';
	}	
	return this[this.cursor];
}
console.commandHistory.pushAndReset = function(command) {
	this.push(command);
	this.cursor = this.length;
}

// After running a command, we scroll down the page
// 100px to keep the result and textbox in view
console.scrollWindow = function() {
	window.scrollBy({top: 200, left: 0, behavior: 'smooth'});
};

console.log = function() {
	console.render('log', arguments);
};

console.warn = function() {
	console.render('warn', arguments);
};

console.error = function() {
	console.render('error', arguments);
};

// Render a new entry to the log
console.render = function(cssClass, items, prefix) {

	// Convert everything to a string representation
	items = [...items].map(i => {
	
		if (i === null)
			return 'null';
	
		// Strings
		if (typeof i == 'string') {
			// Truncate long ones
			if (i.length > 300)
				return i.substring(0, 300).htmlEncode() + '...';
			return i.htmlEncode();
		}
			
		// Functions
		if (typeof i == 'function')
			return i.toString().htmlEncode(); // 'function() {...}';
		
		// Reveal properties for objects
		// (those that are not arrays)
		if (typeof i == 'object' && !Array.isArray(i))
			i = unhideProperties(i);
		
		// All other objects
		try {
			let result = JSON.stringify(i, null, 2);
			if (typeof result == 'string')
				result = result.htmlEncode();
			return result;
		} catch (e) {
			return 'Error: ' + e.message;
		}
	});
	
	// Render in a new DIV
	let div = document.createElement('div');
	div.className = cssClass;
	div.innerHTML = 
		(prefix ? `<span class="prefix">${prefix.htmlEncode()}</span>\n` : '')
		+ items.join('\n');
	consoleDiv.appendChild(div);
};

console.previewCommand = function(command) {

}

/**
 * Called when a user manually runs some code via the text entry box
 * We'll execute that code and print the result
 */
console.runCommand = function(command) {
	
	// Since iOS tends to type in curly quotes
	// we'll strip those first
	command = command
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201c\u201d]/g, '"');

	// Try assigning the value, if that works
	// (since eval({a:1}) doesn't show the object)
	var result;
	var evalError = false;
	try {
		result = eval('__temp__=' + command);
	} catch {
		// Nope, that produced an error, so instead
		// we'll attempt to just eval() it
		try {
			result = eval(command);
		} catch (e) {
			evalError = true;
			console.render('error', ['Error: ' + e.message], command);
		}
	}
	
	// Render the result to the screen
	// If it was an evalError, it's likely that the console
	// hook already caught the error separately and we don't
	// need to print it here again
	if (!evalError)
		console.render('log', [result], command);
	
	// Remember the command for later recall
	console.commandHistory.pushAndReset(command);
};

console.textBox = document.getElementById('commandBox');

// Cycle through previous commands using up and down arrows
console.onKeyPress = function(event) {
	if (event.code == 'ArrowUp') {
	
		// Remember current command so it's not lost
		if (this.textBox.value && 
			(this.commandHistory.cursor === null ||
			this.commandHistory.cursor === this.commandHistory.length)) {
			this.commandHistory.push(this.textBox.value);
		}

		// Bugfix: prevent the default action, otherwise
		// this causes cursor to be invisibly placed
		// at start of textbox
		event.preventDefault();
		
		this.textBox.value = this.commandHistory.getPrev();
	}
	
	if (event.code == 'ArrowDown') {
		this.textBox.value = this.commandHistory.getNext();
	}
};

// Converts all hidden properties to visible ones
function unhideProperties(obj) {
	if (typeof obj !== 'object')
		return obj;
	let result = {};
	for (let key in obj)
		result[key] = obj[key];
	return result;
}

// Catch all syntax and runtime errors and log them to our custom console
window.onerror = function(errorMsg, url, line, col, e, f) {
	console.render('error', [`${errorMsg} in ${url}, line ${line}, col ${col}.`], 'Javascript Error:');
};

function htmlEncode(text) { 
	let d = document.createElement('div'); 
	d.innerText = text; 
	return d.innerHTML;
}

String.prototype.htmlEncode = function() { return htmlEncode(this); };

// Is this still needed? Maybe not
// range(2,4) => [2,3,4]
function range(a,b) { 
	result = []; 
	for (let i=a; i<=b; i++) 
		result.push(i); 
	return result; 
}