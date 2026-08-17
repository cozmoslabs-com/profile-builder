export function toggleInCsv( csv, value, checked ) {
    const list = csv ? csv.split( ',' ).map( ( v ) => v.trim() ).filter( Boolean ) : [];
    const i = list.indexOf( value );
    if ( checked && i === -1 ) list.push( value );
    if ( ! checked && i !== -1 ) list.splice( i, 1 );
    return list.join( ',' );
}

export function csvIncludes( csv, value ) {
    if ( ! csv ) return false;
    return csv.split( ',' ).map( ( v ) => v.trim() ).includes( value );
}
