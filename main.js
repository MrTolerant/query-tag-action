const { exec } = require('child_process');

// github actions pass inputs as environment variables prefixed with INPUT_ and uppercased
function getInput(key) {
    var variable = 'INPUT_'+key;
    var result = process.env[variable.toUpperCase()];
    console.log(`Using input for ${key}: ${result}`);
    return result;
}

// rather than npm install @actions/core, output using the console logging syntax
// see https://help.github.com/en/actions/reference/workflow-commands-for-github-actions#setting-an-output-parameter
function setOutput(key, value) {
    console.log(`::set-output name=${key}::${value}`)
}

try {
    const include = getInput('include');
    const exclude = getInput('exclude');
    const commitIsh = getInput('commit-ish');
    const increment = getInput('increment') === 'true';
    const skipUnshallow = getInput('skip-unshallow') === 'true';
    const abbrev = getInput("abbrev");

    var includeOption = '';
    var excludeOption = '';
    var commitIshOption = '';
    var abbrevOption = '';

    if (typeof include === 'string' && include.length > 0) {
        includeOption = `--match '${include}'`;
    }

    if (typeof exclude === 'string' && exclude.length > 0) {
        excludeOption = `--exclude '${exclude}'`;
    }

    if (typeof commitIsh === 'string') {
        if (commitIsh === '' || commitIsh === 'HEAD') {
            console.warn('Passing empty string or HEAD to commit-ish will get the "current" tag rather than "previous". For previous tag, try "HEAD~".');
        }
        commitIshOption = `'${commitIsh}'`;
    }

    if (abbrev !== 'false') {
      abbrevOption = `--abbrev=${abbrev}`;
    }

    var unshallowCmd = skipUnshallow ? '' : 'git fetch --prune --unshallow &&'

    // actions@checkout performs a shallow checkout. Need to unshallow for full tags access.
    var cmd = `${unshallowCmd} git describe --tags ${abbrevOption} ${includeOption} ${excludeOption} ${commitIshOption}`.replace(/[ ]+/, ' ').trim();
    console.log(`Executing: ${cmd}`);

    exec(cmd, (err, tag, stderr) => {
        if (err) {
            console.error(`Unable to find an earlier tag.\n${stderr}`);
            return process.exit(1);
        }
        if (increment) {
           const splitedTag  = tag.split('.')
           const tagLength =  splitedTag.length
           splitedTag[tagLength - 1] += 1
           const incrementedTag = splitedTag.join('.')
           console.log(`Outputting tag: ${incrementedTag}`)
           return setOutput('tag', incrementedTag);
        }
        console.log(`Outputting tag: ${tag.trim()}`)
        return setOutput('tag', tag.trim());
    });
} catch (error) {
    core.setFailed(error.message);
}
