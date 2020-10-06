export const Table = (topLeft: RoomPosition, table: any[][]) => {
    if (table.length === 0) throw new Error('Expected at least one row')
    let headers = table.slice(0, 1)[0] as string[];
    let body = table.slice(1);
    if (headers.length === 0) throw new Error('Expected at least one column')

    // Calculate width of cells
    let columnOffsets: number[] = [];
    let columnWidths = headers.map((header, index) => {
        // Each character is approximately 40% the width of a grid square at default font size
        let width = Math.ceil(table.reduce((maxWidth, row) => Math.max(maxWidth, row[index].toString().length * 0.4), 0))
        columnOffsets.push((columnOffsets[index-1] || 0) + width + 1);
        return width;
    })
    columnOffsets.unshift(0);

    let tableWidth = columnWidths.reduce((a, b) => a + b, 0) + 1 + columnWidths.length;
    let tableHeight = table.length + 1 // plus the header row

    let vis = new RoomVisual(topLeft.roomName);
    // Draw table background
    vis.rect(topLeft.x, topLeft.y, tableWidth, tableHeight, {
        fill: 'rgba(0,0,0,0.3)',
        stroke: 'rgba(255,255,255,0.3)'
    });
    // Draw headers
    headers.forEach((header, index) => {
        vis.text(header, topLeft.x + 1 + columnOffsets[index], topLeft.y + 1, {align: 'left'});
    })
    // Draw body
    body.forEach((row, rowIndex) => {
        row.forEach((cell, columnIndex) => {
            vis.text(cell, topLeft.x + 1 + columnOffsets[columnIndex], topLeft.y + 2 + rowIndex, {align: 'left'});
        })
    })
}
