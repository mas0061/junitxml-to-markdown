import { Glob } from 'bun'
import { type TestSuite, type TestSuites, parse } from 'junit2json'

const convertTestsuites = (testsuite: TestSuites) => {
  if (testsuite.tests === undefined || testsuite.failures === undefined || testsuite.errors === undefined) {
    return ''
  }
  const success = testsuite.tests - testsuite.failures - testsuite.errors
  return `| ${testsuite.name} | ${success} | ${testsuite.failures} | ${testsuite.errors} | - | ${testsuite.tests} |\n\n`
}

const convertTestsuite = (testsuite: TestSuite) => {
  if (
    testsuite.tests === undefined ||
    testsuite.failures === undefined ||
    testsuite.errors === undefined ||
    testsuite.skipped === undefined
  ) {
    console.log('nothing any value')
    return ''
  }
  const success = testsuite.tests - testsuite.failures - testsuite.errors - testsuite.skipped
  return `| ${testsuite.name} | ${success} | ${testsuite.failures} | ${testsuite.errors} | ${testsuite.skipped} | ${testsuite.tests} |\n\n`
}

const processResultData = (results: TestSuites | TestSuite) => {
  console.log(results)
  if ('testsuite' in results) {
    // type TestSuites
    const testSuitesMd = convertTestsuites(results)
    if (testSuitesMd.length > 0) {
      markdownString += MARKDOWN_HEADER + testSuitesMd
    }
    if (results.testsuite && results.testsuite.length > 0) {
      for (const testsuite of results.testsuite) {
        if (!('tests' in testsuite)) {
          console.log('  do not have "tests"')
          continue
        }
        markdownString += MARKDOWN_HEADER + convertTestsuite(testsuite)
      }
    }
  } else if ('testcase' in results) {
    // type TestSuite
    const testSuitesMd = convertTestsuite(results)
    if (testSuitesMd.length > 0) {
      markdownString += MARKDOWN_HEADER + testSuitesMd
    }
  }
}

const args = process.argv.slice(2)

if (args.length < 1 || args[0].length < 1) {
  console.error('Invalid parameter: junitxml-path')
  process.exit(1)
}

const junitxml_path = args[0]
console.log(`junitxml_path: ${junitxml_path}`)
const glob = new Glob(junitxml_path)

const MARKDOWN_HEADER =
  '| Testsuite | :white_check_mark: Success | :fire: Failure | :x: Error | :fast_forward: Skip | **Total** |\n| --------- | ------- | ------- | ----- | ---- | ----- |\n'
let markdownString = '## Test results\n\n'

for await (const file of glob.scan('.')) {
  console.log(`process file - ${file}`)
  const fileText = await Bun.file(file).text()
  const results = await parse(fileText)

  if (!results) {
    console.log('  can not parse XML')
    continue
  }
  processResultData(results)
}

console.log(markdownString)
await Bun.write('./junitxml.md', markdownString)
