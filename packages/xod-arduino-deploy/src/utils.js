import os from 'os';
import R from 'ramda';
import path from 'path';

export const isWindows = (os.platform() === 'win32');

// :: FQBN -> { package: String, architecture: String, boardIdentifier: String }
export const parseFQBN = R.compose(
  R.applySpec({
    package: R.head,
    architecture: R.nth(1),
    boardIdentifier: R.last,
  }),
  R.split(':')
);

// :: { package: String, architecture: String, boardIdentifier: String } -> FQBN
export const strigifyFQBN = ({ package: pkg, architecture, boardIdentifier }) => (
  `${pkg}:${architecture}:${boardIdentifier}`
);

// :: FQBN -> String -> PackageIndex -> String
export const getToolVersion = R.curry(
  (fqbn, toolName, packageIndex) => R.compose(
    pab => R.compose(
      R.ifElse(
        // ArduinoIDE has a preinstalled avr hardware
        // And some boards (arduino:samd:tian) uses tools from this package.
        // But PackageIndex doesn't has it in the `toolsDependencies` list.
        // So for these cases we have to fallback to avr architecture
        // to search for tools...
        R.both(R.isNil, () => (pab.architecture !== 'avr')),
        () => getToolVersion(
          `${pab.package}:avr:${pab.boardIdentifier}`,
          toolName,
          packageIndex
        ),
        R.prop('version')
      ),
      R.find(R.propEq('name', toolName)),
      R.prop('tools'),
      R.find(R.propEq('architecture', pab.architecture)),
      R.prop(pab.package)
    )(packageIndex),
    parseFQBN
  )(fqbn)
);

// :: { package: String, architecture: String } -> Path -> Path
export const getArchitectureDirectory = R.curry(
  (fqbn, packagesDir) => {
    const pab = parseFQBN(fqbn);
    return path.join(packagesDir, pab.package, 'hardware', pab.architecture);
  }
);

// :: FQBN -> PackageIndex -> Architecture
export const getArchitectureByFqbn = R.curry(
  (fqbn, packageIndex) => {
    const pab = parseFQBN(fqbn);

    return R.compose(
      R.find(R.propEq('architecture', pab.architecture)),
      R.prop(pab.package)
    )(packageIndex);
  }
);

// :: FQBN -> PackageIndex -> [Tool]
export const getToolsByFqbn = R.compose(
  R.prop('tools'),
  getArchitectureByFqbn
);

// :: FQBN -> PackageIndex -> URL
export const getToolsUrl = R.compose(
  R.prop(os.platform()),
  R.prop('toolsUrls'),
  getArchitectureByFqbn
);

// :: FQBN -> PackageIndex -> Path
export const getToolsDirectory = R.curry(
  (fqbn, packagesDir) => path.join(
    packagesDir,
    parseFQBN(fqbn).package,
    'tools'
  )
);

// :: String -> String -> Path -> Path
export const getToolVersionDirectory = R.curry(
  (toolName, toolVersion, toolsDir) => path.join(
    toolsDir,
    toolName,
    toolVersion
  )
);

// :: BoardPrefs -> String
export const getBoardUploadTool = R.compose(
  R.when( // Dirty hack to use `openocd` tool to upload with bootloader size
    R.equals('openocd-withbootsize'),
    R.always('openocd')
  ),
  R.path(['upload', 'tool'])
);

// :: PackageIndex -> [{ name: String, package: String, architecture: String, version: String }]
export const listBoardsFromIndex = R.compose(
  R.flatten,
  R.values,
  R.mapObjIndexed(
    (pkg, pkgName) => R.map(
      arch => R.compose(
        R.map(board => ({
          name: board.name,
          package: pkgName,
          architecture: arch.architecture,
          version: arch.version,
        })),
        R.prop('boards')
      )(arch),
      pkg
    )
  )
);

// :: ChildProcessResult -> { exitCode: Number, stdout: String, stderr: String }
export const normalizeChildProcessResult = r => ({
  exitCode: r.childProcess.exitCode,
  stdout: r.stdout,
  stderr: r.stderr,
});
