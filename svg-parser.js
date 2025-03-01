// Copyright (C) 2024 Paul Johnson
// Copyright (C) 2024-2025 Maxim Nesterov

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

const parse_path = (path, x, y) => {
    let at = 0;
    path = path.replaceAll(/[A-Za-z]/g, str => ' ' + str + ' ').replaceAll(",", " ").replaceAll("-", " -");
    path = path.slice(1, path.length - 1).split(' ').filter(x => x);
    let ret_str = 'rr_renderer_begin_path(renderer);\n';
    let curr_op = 'm';
    const bx = x, by = y;
    const op_parse = _ => {
        switch(curr_op)
        {
            case 'M':
                x = parseFloat(path[at++]) + bx;
                y = parseFloat(path[at++]) + by;
                ret_str += `rr_renderer_move_to(renderer, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            case 'L':
            {
                const prev_x = x;
                const prev_y = y;
                x = parseFloat(path[at++]) + bx;
                y = parseFloat(path[at++]) + by;
                if (Math.abs(x - prev_x) > 0.001 || Math.abs(y - prev_y) > 0.001)
                    ret_str += `rr_renderer_line_to(renderer, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'H':
            {
                const prev_x = x;
                x = parseFloat(path[at++]) + bx;
                if (Math.abs(x - prev_x) > 0.001)
                    ret_str += `rr_renderer_line_to(renderer, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'V':
            {
                const prev_y = y;
                y = parseFloat(path[at++]) + by;
                if (Math.abs(y - prev_y) > 0.001)
                    ret_str += `rr_renderer_line_to(renderer, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'Q':
            {
                const x1 = parseFloat(path[at++]) + bx;
                const y1 = parseFloat(path[at++]) + by;
                x = parseFloat(path[at++]) + bx;
                y = parseFloat(path[at++]) + by;
                ret_str += `rr_renderer_quadratic_curve_to(renderer, ${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'C':
            {
                const x1 = parseFloat(path[at++]) + bx;
                const y1 = parseFloat(path[at++]) + by;
                const x2 = parseFloat(path[at++]) + bx;
                const y2 = parseFloat(path[at++]) + by;
                x = parseFloat(path[at++]) + bx;
                y = parseFloat(path[at++]) + by;
                ret_str += `rr_renderer_bezier_curve_to(renderer, ${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)}, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'm':
                x += parseFloat(path[at++]);
                y += parseFloat(path[at++]);
                ret_str += `rr_renderer_move_to(renderer, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            case 'l':
            {
                const prev_x = x;
                const prev_y = y;
                x += parseFloat(path[at++]);
                y += parseFloat(path[at++]);
                if (Math.abs(x - prev_x) > 0.001 || Math.abs(y - prev_y) > 0.001)
                    ret_str += `rr_renderer_line_to(renderer, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'h':
            {
                const prev_x = x;
                x += parseFloat(path[at++]);
                if (Math.abs(x - prev_x) > 0.001)
                    ret_str += `rr_renderer_line_to(renderer, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'v':
            {
                const prev_y = y;
                y += parseFloat(path[at++]);
                if (Math.abs(y - prev_y) > 0.001)
                    ret_str += `rr_renderer_line_to(renderer, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'q':
            {
                const x1 = x + parseFloat(path[at++]);
                const y1 = y + parseFloat(path[at++]);
                x += parseFloat(path[at++]);
                y += parseFloat(path[at++]);
                ret_str += `rr_renderer_quadratic_curve_to(renderer, ${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'c':
            {
                const x1 = x + parseFloat(path[at++]);
                const y1 = y + parseFloat(path[at++]);
                const x2 = x + parseFloat(path[at++]);
                const y2 = y + parseFloat(path[at++]);
                x += parseFloat(path[at++]);
                y += parseFloat(path[at++]);
                ret_str += `rr_renderer_bezier_curve_to(renderer, ${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)}, ${x.toFixed(2)}, ${y.toFixed(2)});\n`;
                break;
            }
            case 'z':
                break;
        }
    }
    while (at < path.length)
    {
        if (!Number.isFinite(parseFloat[path[at]]))    
            curr_op = path[at++];
        op_parse();
    }
    return ret_str;
}

const parse_svg = str => {
    let doc = new DOMParser().parseFromString(str, 'text/xml');
    const [offset_x, offset_y] = doc.getElementsByTagName('svg')[0].attributes.viewBox.value.split(' ').map(x => parseFloat(x)).slice(2);
    doc = [...doc.getElementsByTagName('path')].map(x => x.attributes).filter(x => !x["clip-rule"] && (!x["fill-opacity"] || parseFloat(x["fill-opacity"].nodeValue) !== 0));
    let ret = "";
    for (let x of doc)
    {
        if (x["fill"])
        {
            if (x["fill-opacity"])
                ret += `rr_renderer_set_fill(renderer, 0x${((x["fill-opacity"].nodeValue * 255) | 0).toString(16).padStart(2, '0')}${x["fill"].nodeValue.slice(1)});\n`;
            else
                ret += `rr_renderer_set_fill(renderer, 0xff${x["fill"].nodeValue.slice(1)});\n`;
        }
        ret += parse_path(x["d"].nodeValue, -offset_x / 2, -offset_y / 2);
        if (x["fill"])
            ret += `rr_renderer_fill(renderer);\n`;
    }
    console.log(ret);
}