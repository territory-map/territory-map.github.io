"""Reassemble a verified Pages package from browser-sized upload ZIPs."""
from pathlib import Path,PurePosixPath
from zipfile import ZipFile
import hashlib,json,shutil,stat,argparse

def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()

def assemble(source,destination):
    source=source.resolve();destination=destination.resolve()
    manifest=json.loads((source/'bundle-manifest.json').read_text(encoding='utf-8'))
    expected={row['path']:row for row in manifest['files']}
    if len(expected)!=len(manifest['files']):raise ValueError('Doppelte Dateinamen in der Dateiliste.')
    for part in manifest['parts']:
        if Path(part['name']).name!=part['name']:raise ValueError('Ungültiger Name einer Upload-Datei.')
        path=source/part['name']
        if not path.is_file():raise ValueError('Upload-Datei fehlt: '+part['name'])
        if path.stat().st_size!=part['bytes'] or digest(path)!=part['sha256']:
            raise ValueError('Upload-Datei ist unvollständig oder verändert: '+part['name'])
    destination.mkdir(parents=True,exist_ok=False)
    seen=set()
    for part in manifest['parts']:
        with ZipFile(source/part['name']) as archive:
            for entry in archive.infolist():
                rel=PurePosixPath(entry.filename)
                if rel.is_absolute() or '..' in rel.parts or '\\' in entry.filename or stat.S_ISLNK(entry.external_attr>>16):
                    raise ValueError('Ungültiger Dateipfad im Upload.')
                if entry.is_dir():continue
                if entry.filename not in expected or entry.filename in seen:raise ValueError('Unerwartete oder doppelte Datei: '+entry.filename)
                target=destination.joinpath(*rel.parts).resolve()
                if not target.is_relative_to(destination):raise ValueError('Ungültiger Dateipfad.')
                target.parent.mkdir(parents=True,exist_ok=True)
                with archive.open(entry) as src,target.open('wb') as dst:shutil.copyfileobj(src,dst)
                wanted=expected[entry.filename]
                if target.stat().st_size!=wanted['bytes'] or digest(target)!=wanted['sha256']:
                    raise ValueError('Datei ist unvollständig oder verändert: '+entry.filename)
                seen.add(entry.filename)
    if seen!=set(expected):raise ValueError('Das Paket enthält nicht alle erforderlichen Dateien.')
    print(f'Vollständiges Paket geprüft: {len(seen)} Dateien aus {len(manifest["parts"])} Upload-Dateien.',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='_bundle');args=parser.parse_args()
    assemble(Path(__file__).resolve().parent,Path(args.output))
