import { Glob } from 'bun'
import { type TestSuite, type TestSuites, parse } from 'junit2json'

const MARKDOWN_HEADER =
  '| Testsuite | :white_check_mark: Success | :fire: Failure | :x: Error | :fast_forward: Skip | **Total** |\n| --------- | ------- | ------- | ----- | ---- | ----- |\n'

const convertTestsuites = (testsuite: TestSuites): string => {
  if (
    testsuite.name === undefined ||
    testsuite.tests === undefined ||
    testsuite.failures === undefined ||
    testsuite.errors === undefined
  ) {
    console.log('  nothing any value')
    return ''
  }
  const success = testsuite.tests - testsuite.failures - testsuite.errors
  const { packageName, className } = separatePackages(testsuite.name)
  const name = `<details><sumarry>${className}</summary>${packageName}</details>`
  return `| ${name} | ${success} | ${testsuite.failures} | ${testsuite.errors} | - | ${testsuite.tests} |\n\n`
}

const convertTestsuite = (testsuite: TestSuite): string => {
  if (
    testsuite.name === undefined ||
    testsuite.tests === undefined ||
    testsuite.failures === undefined ||
    testsuite.errors === undefined ||
    testsuite.skipped === undefined
  ) {
    console.log('  nothing any value')
    return ''
  }
  const success = testsuite.tests - testsuite.failures - testsuite.errors - testsuite.skipped
  const { packageName, className } = separatePackages(testsuite.name)
  const name = `<details><sumarry>${className}</summary>${packageName}</details>`
  return `| ${name} | ${success} | ${testsuite.failures} | ${testsuite.errors} | ${testsuite.skipped} | ${testsuite.tests} |\n\n`
}

const processResultData = (results: TestSuites | TestSuite): string => {
  let resultMarkdown = ''
  if ('testsuite' in results) {
    // type TestSuites
    const testSuitesMd = convertTestsuites(results)
    if (testSuitesMd.length > 0) {
      resultMarkdown += MARKDOWN_HEADER + testSuitesMd
    }
    if (results.testsuite && results.testsuite.length > 0) {
      for (const testsuite of results.testsuite) {
        if (!('tests' in testsuite)) {
          console.log('  do not have "tests"')
          continue
        }
        resultMarkdown += MARKDOWN_HEADER + convertTestsuite(testsuite)
      }
    }
  } else if ('testcase' in results) {
    // type TestSuite
    const testSuitesMd = convertTestsuite(results)
    if (testSuitesMd.length > 0) {
      resultMarkdown += MARKDOWN_HEADER + testSuitesMd
    }
  }

  return resultMarkdown
}

const separatePackages = (classFqdn: string): { packageName: string; className: string } => {
  const parts = classFqdn.split('.')
  const className = (parts.pop() !== undefined ? parts.pop() : '') as string
  const packageName = parts.join('.')
  return {
    packageName: packageName,
    className: className,
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

let markdownString = '## Test results\n\n'

for await (const file of glob.scan('.')) {
  console.log(`process file - ${file}`)
  const fileText = await Bun.file(file).text()
  const results = await parse(fileText)

  if (!results) {
    console.log('  can not parse XML')
    continue
  }
  markdownString += processResultData(results)
}

console.log(markdownString)
await Bun.write('./junitxml.md', markdownString)
