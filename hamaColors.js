/**
 * Hama 兼容 221 色全色库 + O(1) RGB 查找表
 *
 * 数据说明：
 * - 官方 Hama midi 色卡为 89 色（见 HAMA_CLASSIC_89）
 * - 市售「221 色全色库 / Hama 兼容 221」与 MARD 221 色卡一致（色号 A1–M15）
 * - 色值来源：Bitbead palettes.json（CC BY 4.0）https://www.bitbead.app
 *
 * 性能：buildColorLUT() 将 RGB 量化为 6-bit/通道（64³=262144）并预计算最近色索引；
 * nearestColor(r,g,b) 为 O(1) 查表，50×50 图纸可流畅生成。
 *
 * 浏览器：<script type="module"> import ... 或调用 attachToGlobal()
 * Node：import { HAMA_COLORS, buildColorLUT, nearestColor } from './hamaColors.js'
 */

export const HAMA_COLORS = [
  {
    "id": "A1",
    "name": "A1",
    "hex": "#FAF4C8",
    "type": "normal"
  },
  {
    "id": "A2",
    "name": "A2",
    "hex": "#FFFFD5",
    "type": "normal"
  },
  {
    "id": "A3",
    "name": "A3",
    "hex": "#FEFF8B",
    "type": "normal"
  },
  {
    "id": "A4",
    "name": "A4",
    "hex": "#FBED56",
    "type": "normal"
  },
  {
    "id": "A5",
    "name": "A5",
    "hex": "#F4D738",
    "type": "normal"
  },
  {
    "id": "A6",
    "name": "A6",
    "hex": "#FEAC4C",
    "type": "normal"
  },
  {
    "id": "A7",
    "name": "A7",
    "hex": "#FE8B4C",
    "type": "normal"
  },
  {
    "id": "A8",
    "name": "A8",
    "hex": "#FFDA45",
    "type": "normal"
  },
  {
    "id": "A9",
    "name": "A9",
    "hex": "#FF995B",
    "type": "normal"
  },
  {
    "id": "A10",
    "name": "A10",
    "hex": "#F77C31",
    "type": "normal"
  },
  {
    "id": "A11",
    "name": "A11",
    "hex": "#FFDD99",
    "type": "normal"
  },
  {
    "id": "A12",
    "name": "A12",
    "hex": "#FE9F72",
    "type": "normal"
  },
  {
    "id": "A13",
    "name": "A13",
    "hex": "#FFC365",
    "type": "normal"
  },
  {
    "id": "A14",
    "name": "A14",
    "hex": "#FD543D",
    "type": "normal"
  },
  {
    "id": "A15",
    "name": "A15",
    "hex": "#FFF365",
    "type": "normal"
  },
  {
    "id": "A16",
    "name": "A16",
    "hex": "#FFFF9F",
    "type": "normal"
  },
  {
    "id": "A17",
    "name": "A17",
    "hex": "#FFE36E",
    "type": "normal"
  },
  {
    "id": "A18",
    "name": "A18",
    "hex": "#FEBE7D",
    "type": "normal"
  },
  {
    "id": "A19",
    "name": "A19",
    "hex": "#FD7C72",
    "type": "normal"
  },
  {
    "id": "A20",
    "name": "A20",
    "hex": "#FFD568",
    "type": "normal"
  },
  {
    "id": "A21",
    "name": "A21",
    "hex": "#FFE395",
    "type": "normal"
  },
  {
    "id": "A22",
    "name": "A22",
    "hex": "#F4F57D",
    "type": "normal"
  },
  {
    "id": "A23",
    "name": "A23",
    "hex": "#E6C9B7",
    "type": "normal"
  },
  {
    "id": "A24",
    "name": "A24",
    "hex": "#F7F8A2",
    "type": "normal"
  },
  {
    "id": "A25",
    "name": "A25",
    "hex": "#FFD67D",
    "type": "normal"
  },
  {
    "id": "A26",
    "name": "A26",
    "hex": "#FFC830",
    "type": "normal"
  },
  {
    "id": "B1",
    "name": "B1",
    "hex": "#E6EE31",
    "type": "normal"
  },
  {
    "id": "B2",
    "name": "B2",
    "hex": "#63F347",
    "type": "normal"
  },
  {
    "id": "B3",
    "name": "B3",
    "hex": "#9EF780",
    "type": "normal"
  },
  {
    "id": "B4",
    "name": "B4",
    "hex": "#5DE035",
    "type": "normal"
  },
  {
    "id": "B5",
    "name": "B5",
    "hex": "#35E352",
    "type": "normal"
  },
  {
    "id": "B6",
    "name": "B6",
    "hex": "#65E2A6",
    "type": "normal"
  },
  {
    "id": "B7",
    "name": "B7",
    "hex": "#3DAF80",
    "type": "normal"
  },
  {
    "id": "B8",
    "name": "B8",
    "hex": "#1C9C4F",
    "type": "normal"
  },
  {
    "id": "B9",
    "name": "B9",
    "hex": "#27523A",
    "type": "normal"
  },
  {
    "id": "B10",
    "name": "B10",
    "hex": "#95D3C2",
    "type": "normal"
  },
  {
    "id": "B11",
    "name": "B11",
    "hex": "#5D722A",
    "type": "normal"
  },
  {
    "id": "B12",
    "name": "B12",
    "hex": "#166F41",
    "type": "normal"
  },
  {
    "id": "B13",
    "name": "B13",
    "hex": "#CAEB7B",
    "type": "normal"
  },
  {
    "id": "B14",
    "name": "B14",
    "hex": "#ADE946",
    "type": "normal"
  },
  {
    "id": "B15",
    "name": "B15",
    "hex": "#2E5132",
    "type": "normal"
  },
  {
    "id": "B16",
    "name": "B16",
    "hex": "#C5ED9C",
    "type": "normal"
  },
  {
    "id": "B17",
    "name": "B17",
    "hex": "#9BB13A",
    "type": "normal"
  },
  {
    "id": "B18",
    "name": "B18",
    "hex": "#E6EE49",
    "type": "normal"
  },
  {
    "id": "B19",
    "name": "B19",
    "hex": "#24B88C",
    "type": "normal"
  },
  {
    "id": "B20",
    "name": "B20",
    "hex": "#C2F0CC",
    "type": "normal"
  },
  {
    "id": "B21",
    "name": "B21",
    "hex": "#156A6B",
    "type": "normal"
  },
  {
    "id": "B22",
    "name": "B22",
    "hex": "#0B3C43",
    "type": "normal"
  },
  {
    "id": "B23",
    "name": "B23",
    "hex": "#303A21",
    "type": "normal"
  },
  {
    "id": "B24",
    "name": "B24",
    "hex": "#EEFCA5",
    "type": "normal"
  },
  {
    "id": "B25",
    "name": "B25",
    "hex": "#4E846D",
    "type": "normal"
  },
  {
    "id": "B26",
    "name": "B26",
    "hex": "#8D7A35",
    "type": "normal"
  },
  {
    "id": "B27",
    "name": "B27",
    "hex": "#CCE1AF",
    "type": "normal"
  },
  {
    "id": "B28",
    "name": "B28",
    "hex": "#9EE5B9",
    "type": "normal"
  },
  {
    "id": "B29",
    "name": "B29",
    "hex": "#C5E254",
    "type": "normal"
  },
  {
    "id": "B30",
    "name": "B30",
    "hex": "#E2FCB1",
    "type": "normal"
  },
  {
    "id": "B31",
    "name": "B31",
    "hex": "#B0E792",
    "type": "normal"
  },
  {
    "id": "B32",
    "name": "B32",
    "hex": "#9CAB5A",
    "type": "normal"
  },
  {
    "id": "C1",
    "name": "C1",
    "hex": "#E8FFE7",
    "type": "normal"
  },
  {
    "id": "C2",
    "name": "C2",
    "hex": "#A9F9FC",
    "type": "normal"
  },
  {
    "id": "C3",
    "name": "C3",
    "hex": "#A0E2FB",
    "type": "normal"
  },
  {
    "id": "C4",
    "name": "C4",
    "hex": "#41CCFF",
    "type": "normal"
  },
  {
    "id": "C5",
    "name": "C5",
    "hex": "#01ACEB",
    "type": "normal"
  },
  {
    "id": "C6",
    "name": "C6",
    "hex": "#50AAF0",
    "type": "normal"
  },
  {
    "id": "C7",
    "name": "C7",
    "hex": "#3677D2",
    "type": "normal"
  },
  {
    "id": "C8",
    "name": "C8",
    "hex": "#0F54C0",
    "type": "normal"
  },
  {
    "id": "C9",
    "name": "C9",
    "hex": "#324BCA",
    "type": "normal"
  },
  {
    "id": "C10",
    "name": "C10",
    "hex": "#3EBCE2",
    "type": "normal"
  },
  {
    "id": "C11",
    "name": "C11",
    "hex": "#28DDDE",
    "type": "normal"
  },
  {
    "id": "C12",
    "name": "C12",
    "hex": "#1C334D",
    "type": "normal"
  },
  {
    "id": "C13",
    "name": "C13",
    "hex": "#CDE8FF",
    "type": "normal"
  },
  {
    "id": "C14",
    "name": "C14",
    "hex": "#D5FDFF",
    "type": "normal"
  },
  {
    "id": "C15",
    "name": "C15",
    "hex": "#22C4C6",
    "type": "normal"
  },
  {
    "id": "C16",
    "name": "C16",
    "hex": "#1557A8",
    "type": "normal"
  },
  {
    "id": "C17",
    "name": "C17",
    "hex": "#04D1F6",
    "type": "normal"
  },
  {
    "id": "C18",
    "name": "C18",
    "hex": "#1D3344",
    "type": "normal"
  },
  {
    "id": "C19",
    "name": "C19",
    "hex": "#1887A2",
    "type": "normal"
  },
  {
    "id": "C20",
    "name": "C20",
    "hex": "#176DAF",
    "type": "normal"
  },
  {
    "id": "C21",
    "name": "C21",
    "hex": "#BEDDFF",
    "type": "normal"
  },
  {
    "id": "C22",
    "name": "C22",
    "hex": "#67B4BE",
    "type": "normal"
  },
  {
    "id": "C23",
    "name": "C23",
    "hex": "#C8E2FF",
    "type": "normal"
  },
  {
    "id": "C24",
    "name": "C24",
    "hex": "#7CC4FF",
    "type": "normal"
  },
  {
    "id": "C25",
    "name": "C25",
    "hex": "#A9E5E5",
    "type": "normal"
  },
  {
    "id": "C26",
    "name": "C26",
    "hex": "#3CAED8",
    "type": "normal"
  },
  {
    "id": "C27",
    "name": "C27",
    "hex": "#D3DFFA",
    "type": "normal"
  },
  {
    "id": "C28",
    "name": "C28",
    "hex": "#BBCFED",
    "type": "normal"
  },
  {
    "id": "C29",
    "name": "C29",
    "hex": "#34488E",
    "type": "normal"
  },
  {
    "id": "D1",
    "name": "D1",
    "hex": "#AEB4F2",
    "type": "normal"
  },
  {
    "id": "D2",
    "name": "D2",
    "hex": "#858EDD",
    "type": "normal"
  },
  {
    "id": "D3",
    "name": "D3",
    "hex": "#2F54AF",
    "type": "normal"
  },
  {
    "id": "D4",
    "name": "D4",
    "hex": "#182A84",
    "type": "normal"
  },
  {
    "id": "D5",
    "name": "D5",
    "hex": "#B843C5",
    "type": "normal"
  },
  {
    "id": "D6",
    "name": "D6",
    "hex": "#AC7BDE",
    "type": "normal"
  },
  {
    "id": "D7",
    "name": "D7",
    "hex": "#8854B3",
    "type": "normal"
  },
  {
    "id": "D8",
    "name": "D8",
    "hex": "#E2D3FF",
    "type": "normal"
  },
  {
    "id": "D9",
    "name": "D9",
    "hex": "#D5B9F8",
    "type": "normal"
  },
  {
    "id": "D10",
    "name": "D10",
    "hex": "#361851",
    "type": "normal"
  },
  {
    "id": "D11",
    "name": "D11",
    "hex": "#B9BAE1",
    "type": "normal"
  },
  {
    "id": "D12",
    "name": "D12",
    "hex": "#DE9AD4",
    "type": "normal"
  },
  {
    "id": "D13",
    "name": "D13",
    "hex": "#B90095",
    "type": "normal"
  },
  {
    "id": "D14",
    "name": "D14",
    "hex": "#8B279B",
    "type": "normal"
  },
  {
    "id": "D15",
    "name": "D15",
    "hex": "#2F1F90",
    "type": "normal"
  },
  {
    "id": "D16",
    "name": "D16",
    "hex": "#E3E1EE",
    "type": "normal"
  },
  {
    "id": "D17",
    "name": "D17",
    "hex": "#C4D4F6",
    "type": "normal"
  },
  {
    "id": "D18",
    "name": "D18",
    "hex": "#A45EC7",
    "type": "normal"
  },
  {
    "id": "D19",
    "name": "D19",
    "hex": "#D8C3D7",
    "type": "normal"
  },
  {
    "id": "D20",
    "name": "D20",
    "hex": "#9C32B2",
    "type": "normal"
  },
  {
    "id": "D21",
    "name": "D21",
    "hex": "#9A009B",
    "type": "normal"
  },
  {
    "id": "D22",
    "name": "D22",
    "hex": "#333A95",
    "type": "normal"
  },
  {
    "id": "D23",
    "name": "D23",
    "hex": "#EBDAFC",
    "type": "normal"
  },
  {
    "id": "D24",
    "name": "D24",
    "hex": "#7786E5",
    "type": "normal"
  },
  {
    "id": "D25",
    "name": "D25",
    "hex": "#494FC7",
    "type": "normal"
  },
  {
    "id": "D26",
    "name": "D26",
    "hex": "#DFC2F8",
    "type": "normal"
  },
  {
    "id": "E1",
    "name": "E1",
    "hex": "#FDD3CC",
    "type": "normal"
  },
  {
    "id": "E2",
    "name": "E2",
    "hex": "#FEC0DF",
    "type": "normal"
  },
  {
    "id": "E3",
    "name": "E3",
    "hex": "#FFB7E7",
    "type": "normal"
  },
  {
    "id": "E4",
    "name": "E4",
    "hex": "#E8649E",
    "type": "normal"
  },
  {
    "id": "E5",
    "name": "E5",
    "hex": "#F551A2",
    "type": "normal"
  },
  {
    "id": "E6",
    "name": "E6",
    "hex": "#F13D74",
    "type": "normal"
  },
  {
    "id": "E7",
    "name": "E7",
    "hex": "#C63478",
    "type": "normal"
  },
  {
    "id": "E8",
    "name": "E8",
    "hex": "#FFDBE9",
    "type": "normal"
  },
  {
    "id": "E9",
    "name": "E9",
    "hex": "#E970CC",
    "type": "normal"
  },
  {
    "id": "E10",
    "name": "E10",
    "hex": "#D33793",
    "type": "normal"
  },
  {
    "id": "E11",
    "name": "E11",
    "hex": "#FCDDD2",
    "type": "normal"
  },
  {
    "id": "E12",
    "name": "E12",
    "hex": "#F78FC3",
    "type": "normal"
  },
  {
    "id": "E13",
    "name": "E13",
    "hex": "#B5006D",
    "type": "normal"
  },
  {
    "id": "E14",
    "name": "E14",
    "hex": "#FFD1BA",
    "type": "normal"
  },
  {
    "id": "E15",
    "name": "E15",
    "hex": "#F8C7C9",
    "type": "normal"
  },
  {
    "id": "E16",
    "name": "E16",
    "hex": "#FFF3EB",
    "type": "normal"
  },
  {
    "id": "E17",
    "name": "E17",
    "hex": "#FFE2EA",
    "type": "normal"
  },
  {
    "id": "E18",
    "name": "E18",
    "hex": "#FFC7DB",
    "type": "normal"
  },
  {
    "id": "E19",
    "name": "E19",
    "hex": "#FEBAD5",
    "type": "normal"
  },
  {
    "id": "E20",
    "name": "E20",
    "hex": "#D8C7D1",
    "type": "normal"
  },
  {
    "id": "E21",
    "name": "E21",
    "hex": "#BD9DA1",
    "type": "normal"
  },
  {
    "id": "E22",
    "name": "E22",
    "hex": "#B785A1",
    "type": "normal"
  },
  {
    "id": "E23",
    "name": "E23",
    "hex": "#937A8D",
    "type": "normal"
  },
  {
    "id": "E24",
    "name": "E24",
    "hex": "#E1BCE8",
    "type": "normal"
  },
  {
    "id": "F1",
    "name": "F1",
    "hex": "#FD957B",
    "type": "normal"
  },
  {
    "id": "F2",
    "name": "F2",
    "hex": "#FC3D46",
    "type": "normal"
  },
  {
    "id": "F3",
    "name": "F3",
    "hex": "#F74941",
    "type": "normal"
  },
  {
    "id": "F4",
    "name": "F4",
    "hex": "#FC283C",
    "type": "normal"
  },
  {
    "id": "F5",
    "name": "F5",
    "hex": "#E7002F",
    "type": "normal"
  },
  {
    "id": "F6",
    "name": "F6",
    "hex": "#943630",
    "type": "normal"
  },
  {
    "id": "F7",
    "name": "F7",
    "hex": "#971937",
    "type": "normal"
  },
  {
    "id": "F8",
    "name": "F8",
    "hex": "#BC0028",
    "type": "normal"
  },
  {
    "id": "F9",
    "name": "F9",
    "hex": "#E2677A",
    "type": "normal"
  },
  {
    "id": "F10",
    "name": "F10",
    "hex": "#8A4526",
    "type": "normal"
  },
  {
    "id": "F11",
    "name": "F11",
    "hex": "#5A2121",
    "type": "normal"
  },
  {
    "id": "F12",
    "name": "F12",
    "hex": "#FD4E6A",
    "type": "normal"
  },
  {
    "id": "F13",
    "name": "F13",
    "hex": "#F35744",
    "type": "normal"
  },
  {
    "id": "F14",
    "name": "F14",
    "hex": "#FFA9AD",
    "type": "normal"
  },
  {
    "id": "F15",
    "name": "F15",
    "hex": "#D30022",
    "type": "normal"
  },
  {
    "id": "F16",
    "name": "F16",
    "hex": "#FEC2A6",
    "type": "normal"
  },
  {
    "id": "F17",
    "name": "F17",
    "hex": "#E69C79",
    "type": "normal"
  },
  {
    "id": "F18",
    "name": "F18",
    "hex": "#D37C46",
    "type": "normal"
  },
  {
    "id": "F19",
    "name": "F19",
    "hex": "#C1444A",
    "type": "normal"
  },
  {
    "id": "F20",
    "name": "F20",
    "hex": "#CD9391",
    "type": "normal"
  },
  {
    "id": "F21",
    "name": "F21",
    "hex": "#F7B4C6",
    "type": "normal"
  },
  {
    "id": "F22",
    "name": "F22",
    "hex": "#FDC0D0",
    "type": "normal"
  },
  {
    "id": "F23",
    "name": "F23",
    "hex": "#F67E66",
    "type": "normal"
  },
  {
    "id": "F24",
    "name": "F24",
    "hex": "#E698AA",
    "type": "normal"
  },
  {
    "id": "F25",
    "name": "F25",
    "hex": "#E54B4F",
    "type": "normal"
  },
  {
    "id": "G1",
    "name": "G1",
    "hex": "#FFE2CE",
    "type": "normal"
  },
  {
    "id": "G2",
    "name": "G2",
    "hex": "#FFC4AA",
    "type": "normal"
  },
  {
    "id": "G3",
    "name": "G3",
    "hex": "#F4C3A5",
    "type": "normal"
  },
  {
    "id": "G4",
    "name": "G4",
    "hex": "#E1B383",
    "type": "normal"
  },
  {
    "id": "G5",
    "name": "G5",
    "hex": "#EDB045",
    "type": "normal"
  },
  {
    "id": "G6",
    "name": "G6",
    "hex": "#E99C17",
    "type": "normal"
  },
  {
    "id": "G7",
    "name": "G7",
    "hex": "#9D5B3E",
    "type": "normal"
  },
  {
    "id": "G8",
    "name": "G8",
    "hex": "#753832",
    "type": "normal"
  },
  {
    "id": "G9",
    "name": "G9",
    "hex": "#E6B483",
    "type": "normal"
  },
  {
    "id": "G10",
    "name": "G10",
    "hex": "#D98C39",
    "type": "normal"
  },
  {
    "id": "G11",
    "name": "G11",
    "hex": "#E0C593",
    "type": "normal"
  },
  {
    "id": "G12",
    "name": "G12",
    "hex": "#FFC890",
    "type": "normal"
  },
  {
    "id": "G13",
    "name": "G13",
    "hex": "#B7714A",
    "type": "normal"
  },
  {
    "id": "G14",
    "name": "G14",
    "hex": "#8D614C",
    "type": "normal"
  },
  {
    "id": "G15",
    "name": "G15",
    "hex": "#FCF9E0",
    "type": "normal"
  },
  {
    "id": "G16",
    "name": "G16",
    "hex": "#F2D9BA",
    "type": "normal"
  },
  {
    "id": "G17",
    "name": "G17",
    "hex": "#78524B",
    "type": "normal"
  },
  {
    "id": "G18",
    "name": "G18",
    "hex": "#FFE4CC",
    "type": "normal"
  },
  {
    "id": "G19",
    "name": "G19",
    "hex": "#E07935",
    "type": "normal"
  },
  {
    "id": "G20",
    "name": "G20",
    "hex": "#A94023",
    "type": "normal"
  },
  {
    "id": "G21",
    "name": "G21",
    "hex": "#B88558",
    "type": "normal"
  },
  {
    "id": "H1",
    "name": "H1",
    "hex": "#FDFBFF",
    "type": "normal"
  },
  {
    "id": "H2",
    "name": "H2",
    "hex": "#FEFFFF",
    "type": "normal"
  },
  {
    "id": "H3",
    "name": "H3",
    "hex": "#B6B1BA",
    "type": "normal"
  },
  {
    "id": "H4",
    "name": "H4",
    "hex": "#89858C",
    "type": "normal"
  },
  {
    "id": "H5",
    "name": "H5",
    "hex": "#48464E",
    "type": "normal"
  },
  {
    "id": "H6",
    "name": "H6",
    "hex": "#2F2B2F",
    "type": "normal"
  },
  {
    "id": "H7",
    "name": "H7",
    "hex": "#000000",
    "type": "normal"
  },
  {
    "id": "H8",
    "name": "H8",
    "hex": "#E7D6DB",
    "type": "normal"
  },
  {
    "id": "H9",
    "name": "H9",
    "hex": "#EDEDED",
    "type": "normal"
  },
  {
    "id": "H10",
    "name": "H10",
    "hex": "#EEE9EA",
    "type": "normal"
  },
  {
    "id": "H11",
    "name": "H11",
    "hex": "#CECDD5",
    "type": "normal"
  },
  {
    "id": "H12",
    "name": "H12",
    "hex": "#FFF5ED",
    "type": "normal"
  },
  {
    "id": "H13",
    "name": "H13",
    "hex": "#F5ECD2",
    "type": "normal"
  },
  {
    "id": "H14",
    "name": "H14",
    "hex": "#CFD7D3",
    "type": "normal"
  },
  {
    "id": "H15",
    "name": "H15",
    "hex": "#98A6A8",
    "type": "normal"
  },
  {
    "id": "H16",
    "name": "H16",
    "hex": "#1D1414",
    "type": "normal"
  },
  {
    "id": "H17",
    "name": "H17",
    "hex": "#F1EDED",
    "type": "normal"
  },
  {
    "id": "H18",
    "name": "H18",
    "hex": "#FFFDF0",
    "type": "normal"
  },
  {
    "id": "H19",
    "name": "H19",
    "hex": "#F6EFE2",
    "type": "normal"
  },
  {
    "id": "H20",
    "name": "H20",
    "hex": "#949FA3",
    "type": "normal"
  },
  {
    "id": "H21",
    "name": "H21",
    "hex": "#FFFBE1",
    "type": "normal"
  },
  {
    "id": "H22",
    "name": "H22",
    "hex": "#CACAD4",
    "type": "normal"
  },
  {
    "id": "H23",
    "name": "H23",
    "hex": "#9A9D94",
    "type": "normal"
  },
  {
    "id": "M1",
    "name": "M1",
    "hex": "#BCC6B8",
    "type": "normal"
  },
  {
    "id": "M2",
    "name": "M2",
    "hex": "#8AA386",
    "type": "normal"
  },
  {
    "id": "M3",
    "name": "M3",
    "hex": "#697D80",
    "type": "normal"
  },
  {
    "id": "M4",
    "name": "M4",
    "hex": "#E3D2BC",
    "type": "normal"
  },
  {
    "id": "M5",
    "name": "M5",
    "hex": "#D0CCAA",
    "type": "normal"
  },
  {
    "id": "M6",
    "name": "M6",
    "hex": "#B0A782",
    "type": "normal"
  },
  {
    "id": "M7",
    "name": "M7",
    "hex": "#B4A497",
    "type": "normal"
  },
  {
    "id": "M8",
    "name": "M8",
    "hex": "#B38281",
    "type": "normal"
  },
  {
    "id": "M9",
    "name": "M9",
    "hex": "#A58767",
    "type": "normal"
  },
  {
    "id": "M10",
    "name": "M10",
    "hex": "#C5B2BC",
    "type": "normal"
  },
  {
    "id": "M11",
    "name": "M11",
    "hex": "#9F7594",
    "type": "normal"
  },
  {
    "id": "M12",
    "name": "M12",
    "hex": "#644749",
    "type": "normal"
  },
  {
    "id": "M13",
    "name": "M13",
    "hex": "#D19066",
    "type": "normal"
  },
  {
    "id": "M14",
    "name": "M14",
    "hex": "#C77362",
    "type": "normal"
  },
  {
    "id": "M15",
    "name": "M15",
    "hex": "#757D78",
    "type": "normal"
  }
];

/** 官方 Hama 89 色（对照用；默认匹配走 221 全色库） */
export const HAMA_CLASSIC_89 = [
  {
    "id": "H01",
    "name": "White",
    "hex": "#ECEDED",
    "type": "normal"
  },
  {
    "id": "H02",
    "name": "Cream",
    "hex": "#F0E8B9",
    "type": "normal"
  },
  {
    "id": "H03",
    "name": "Gold",
    "hex": "#F0B901",
    "type": "normal"
  },
  {
    "id": "H04",
    "name": "Orange",
    "hex": "#E64F27",
    "type": "normal"
  },
  {
    "id": "H05",
    "name": "Red",
    "hex": "#B63136",
    "type": "normal"
  },
  {
    "id": "H06",
    "name": "Pink",
    "hex": "#E1889F",
    "type": "normal"
  },
  {
    "id": "H07",
    "name": "Purple",
    "hex": "#694A82",
    "type": "normal"
  },
  {
    "id": "H08",
    "name": "Dark Blue",
    "hex": "#2C4690",
    "type": "normal"
  },
  {
    "id": "H09",
    "name": "Blue",
    "hex": "#305CB0",
    "type": "normal"
  },
  {
    "id": "H10",
    "name": "Dark Green",
    "hex": "#256847",
    "type": "normal"
  },
  {
    "id": "H11",
    "name": "Teal",
    "hex": "#49AE89",
    "type": "normal"
  },
  {
    "id": "H12",
    "name": "Brown",
    "hex": "#534137",
    "type": "normal"
  },
  {
    "id": "H13",
    "name": "Transparent Red",
    "hex": "#C02435",
    "type": "translucent"
  },
  {
    "id": "H14",
    "name": "Transparent Yellow",
    "hex": "#E4AA32",
    "type": "translucent"
  },
  {
    "id": "H15",
    "name": "Transparent Blue",
    "hex": "#487ED5",
    "type": "translucent"
  },
  {
    "id": "H16",
    "name": "Transparent Green",
    "hex": "#37B876",
    "type": "translucent"
  },
  {
    "id": "H17",
    "name": "Gray",
    "hex": "#83888A",
    "type": "normal"
  },
  {
    "id": "H18",
    "name": "Black",
    "hex": "#2E2F31",
    "type": "normal"
  },
  {
    "id": "H19",
    "name": "Clear",
    "hex": "#D8D2CE",
    "type": "translucent"
  },
  {
    "id": "H20",
    "name": "Dark Brown",
    "hex": "#7F332A",
    "type": "normal"
  },
  {
    "id": "H21",
    "name": "Tan",
    "hex": "#A5693F",
    "type": "normal"
  },
  {
    "id": "H22",
    "name": "Burgundy",
    "hex": "#A52D36",
    "type": "normal"
  },
  {
    "id": "H24",
    "name": "Translucent Purple",
    "hex": "#683E9A",
    "type": "translucent"
  },
  {
    "id": "H25",
    "name": "Translucent Brown",
    "hex": "#87593D",
    "type": "translucent"
  },
  {
    "id": "H26",
    "name": "Salmon",
    "hex": "#DE9B90",
    "type": "normal"
  },
  {
    "id": "H27",
    "name": "Tan Light",
    "hex": "#DEB48B",
    "type": "normal"
  },
  {
    "id": "H28",
    "name": "Dark Gray",
    "hex": "#363F38",
    "type": "normal"
  },
  {
    "id": "H29",
    "name": "Magenta",
    "hex": "#B9395E",
    "type": "normal"
  },
  {
    "id": "H30",
    "name": "Maroon",
    "hex": "#592F38",
    "type": "normal"
  },
  {
    "id": "H31",
    "name": "Steel Blue",
    "hex": "#6797AE",
    "type": "normal"
  },
  {
    "id": "H32",
    "name": "Neon Fuchsia",
    "hex": "#FF208D",
    "type": "neon"
  },
  {
    "id": "H33",
    "name": "Bright Red",
    "hex": "#FF3956",
    "type": "normal"
  },
  {
    "id": "H34",
    "name": "Neon Yellow",
    "hex": "#E5EF13",
    "type": "neon"
  },
  {
    "id": "H35",
    "name": "Neon Red",
    "hex": "#FF2833",
    "type": "neon"
  },
  {
    "id": "H36",
    "name": "Neon Blue",
    "hex": "#2353B0",
    "type": "neon"
  },
  {
    "id": "H37",
    "name": "Neon Green",
    "hex": "#06B73C",
    "type": "neon"
  },
  {
    "id": "H38",
    "name": "Neon Orange",
    "hex": "#FD8600",
    "type": "neon"
  },
  {
    "id": "H39",
    "name": "Fluorescent Yellow",
    "hex": "#F1F21C",
    "type": "neon"
  },
  {
    "id": "H40",
    "name": "Fluorescent Orange",
    "hex": "#FE630B",
    "type": "neon"
  },
  {
    "id": "H41",
    "name": "Fluorescent Blue",
    "hex": "#2659B2",
    "type": "neon"
  },
  {
    "id": "H42",
    "name": "Fluorescent Green",
    "hex": "#0CBD51",
    "type": "neon"
  },
  {
    "id": "H43",
    "name": "Bright Yellow",
    "hex": "#F0EA37",
    "type": "normal"
  },
  {
    "id": "H44",
    "name": "Rose",
    "hex": "#EE6972",
    "type": "normal"
  },
  {
    "id": "H45",
    "name": "Mauve",
    "hex": "#886DB9",
    "type": "normal"
  },
  {
    "id": "H46",
    "name": "Cornflower Blue",
    "hex": "#629ED7",
    "type": "normal"
  },
  {
    "id": "H47",
    "name": "Green",
    "hex": "#83CB70",
    "type": "normal"
  },
  {
    "id": "H48",
    "name": "Orchid",
    "hex": "#CF70B7",
    "type": "normal"
  },
  {
    "id": "H49",
    "name": "Ocean Blue",
    "hex": "#4998BC",
    "type": "normal"
  },
  {
    "id": "H60",
    "name": "Burnt Orange",
    "hex": "#F49422",
    "type": "normal"
  },
  {
    "id": "H61",
    "name": "Gold Metallic",
    "hex": "#D99350",
    "type": "normal"
  },
  {
    "id": "H62",
    "name": "Silver Metallic",
    "hex": "#48474A",
    "type": "normal"
  },
  {
    "id": "H63",
    "name": "Bronze Metallic",
    "hex": "#42312F",
    "type": "normal"
  },
  {
    "id": "H64",
    "name": "Pearl",
    "hex": "#EFEBE4",
    "type": "special"
  },
  {
    "id": "H70",
    "name": "Periwinkle",
    "hex": "#B6B6D4",
    "type": "normal"
  },
  {
    "id": "H71",
    "name": "Charcoal",
    "hex": "#464541",
    "type": "normal"
  },
  {
    "id": "H72",
    "name": "Translucent Pink",
    "hex": "#F097B0",
    "type": "translucent"
  },
  {
    "id": "H73",
    "name": "Translucent Aqua",
    "hex": "#59AEF5",
    "type": "translucent"
  },
  {
    "id": "H74",
    "name": "Translucent Lilac",
    "hex": "#5B55BD",
    "type": "translucent"
  },
  {
    "id": "H75",
    "name": "Caramel",
    "hex": "#BF7B4D",
    "type": "normal"
  },
  {
    "id": "H76",
    "name": "Chocolate",
    "hex": "#663317",
    "type": "normal"
  },
  {
    "id": "H77",
    "name": "Beige",
    "hex": "#EDE7DF",
    "type": "normal"
  },
  {
    "id": "H78",
    "name": "Light Orange",
    "hex": "#FFC99A",
    "type": "normal"
  },
  {
    "id": "H79",
    "name": "Apricot",
    "hex": "#F08643",
    "type": "normal"
  },
  {
    "id": "H82",
    "name": "Wine",
    "hex": "#962F5C",
    "type": "normal"
  },
  {
    "id": "H83",
    "name": "Teal Blue",
    "hex": "#0178A4",
    "type": "normal"
  },
  {
    "id": "H84",
    "name": "Olive",
    "hex": "#8B924C",
    "type": "normal"
  },
  {
    "id": "H95",
    "name": "Light Pink",
    "hex": "#F8CCE0",
    "type": "normal"
  },
  {
    "id": "H96",
    "name": "Lilac",
    "hex": "#D4B1E3",
    "type": "normal"
  },
  {
    "id": "H97",
    "name": "Light Blue",
    "hex": "#A2D3FE",
    "type": "normal"
  },
  {
    "id": "H98",
    "name": "Mint",
    "hex": "#9ADBB1",
    "type": "normal"
  },
  {
    "id": "H101",
    "name": "Light Green",
    "hex": "#A9C39B",
    "type": "normal"
  },
  {
    "id": "H102",
    "name": "Forest Green",
    "hex": "#356B2D",
    "type": "normal"
  },
  {
    "id": "H103",
    "name": "Yellow",
    "hex": "#FFE660",
    "type": "normal"
  },
  {
    "id": "H104",
    "name": "Lime Green",
    "hex": "#BCD122",
    "type": "normal"
  },
  {
    "id": "H105",
    "name": "Peach",
    "hex": "#FFAC78",
    "type": "normal"
  },
  {
    "id": "H106",
    "name": "Lavender",
    "hex": "#CCC5ED",
    "type": "normal"
  },
  {
    "id": "H107",
    "name": "Sky Blue",
    "hex": "#6A87C1",
    "type": "normal"
  },
  {
    "id": "H108",
    "name": "Aubergine",
    "hex": "#2A2536",
    "type": "normal"
  },
  {
    "id": "H109",
    "name": "Cloudy Grey",
    "hex": "#8A847F",
    "type": "normal"
  },
  {
    "id": "H110",
    "name": "Matcha",
    "hex": "#838956",
    "type": "normal"
  },
  {
    "id": "H111",
    "name": "Dark Blush",
    "hex": "#835854",
    "type": "normal"
  },
  {
    "id": "H112",
    "name": "Blush",
    "hex": "#AD8A82",
    "type": "normal"
  },
  {
    "id": "H113",
    "name": "Aqua",
    "hex": "#5F887B",
    "type": "normal"
  },
  {
    "id": "H114",
    "name": "Cherry Red",
    "hex": "#9A2C31",
    "type": "normal"
  },
  {
    "id": "H115",
    "name": "Bright Green",
    "hex": "#6E975F",
    "type": "normal"
  },
  {
    "id": "H116",
    "name": "Midnight Blue",
    "hex": "#222838",
    "type": "normal"
  },
  {
    "id": "H117",
    "name": "Taupe Grey",
    "hex": "#777169",
    "type": "normal"
  },
  {
    "id": "H118",
    "name": "Maroon Red",
    "hex": "#612932",
    "type": "normal"
  },
  {
    "id": "H119",
    "name": "Sky Blue Clear",
    "hex": "#4167B4",
    "type": "translucent"
  }
];

/** 按 id 快查 */
export const colorById = Object.fromEntries(HAMA_COLORS.map((c) => [c.id, c]));

export function hexToRgb(hex) {
  const h = String(hex).replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** 人眼加权：绿通道权重更高（加权欧氏距离的平方，省掉 sqrt） */
const WR = 0.3;
const WG = 0.59;
const WB = 0.11;

export function weightedDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return WR * dr * dr + WG * dg * dg + WB * db * db;
}

/**
 * 量化位数（每通道）。
 * 6 → 64³ = 262144 项（约 512KB Uint16），精度更高，构建约百毫秒级
 * 5 → 32³ = 32768 项，更快更省内存
 */
export const LUT_BITS = 6;
const LUT_LEVELS = 1 << LUT_BITS;
const LUT_SHIFT = 8 - LUT_BITS;
const LUT_SIZE = LUT_LEVELS ** 3;

/** @type {Uint16Array | null} */
let lut = null;
/** @type {Uint8Array | null} */
let paletteRgb = null;

function ensurePaletteRgb() {
  if (paletteRgb) return paletteRgb;
  const n = HAMA_COLORS.length;
  paletteRgb = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [r, g, b] = hexToRgb(HAMA_COLORS[i].hex);
    paletteRgb[i * 3] = r;
    paletteRgb[i * 3 + 1] = g;
    paletteRgb[i * 3 + 2] = b;
  }
  return paletteRgb;
}

/**
 * 构建 RGB → 色板索引查找表（启动时调用一次即可）
 * @returns {Uint16Array}
 */
export function buildColorLUT() {
  if (lut) return lut;
  const rgb = ensurePaletteRgb();
  const n = HAMA_COLORS.length;
  lut = new Uint16Array(LUT_SIZE);

  const half = (1 << LUT_SHIFT) >> 1;
  for (let qi = 0; qi < LUT_SIZE; qi++) {
    const rq = (qi >> (LUT_BITS * 2)) & (LUT_LEVELS - 1);
    const gq = (qi >> LUT_BITS) & (LUT_LEVELS - 1);
    const bq = qi & (LUT_LEVELS - 1);
    // 量化格子中心点的 8bit RGB
    const r = (rq << LUT_SHIFT) + half;
    const g = (gq << LUT_SHIFT) + half;
    const b = (bq << LUT_SHIFT) + half;

    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = weightedDistance(
        r,
        g,
        b,
        rgb[i * 3],
        rgb[i * 3 + 1],
        rgb[i * 3 + 2]
      );
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    lut[qi] = best;
  }
  return lut;
}

function rgbToLutIndex(r, g, b) {
  return (
    ((r >> LUT_SHIFT) << (LUT_BITS * 2)) |
    ((g >> LUT_SHIFT) << LUT_BITS) |
    (b >> LUT_SHIFT)
  );
}

/**
 * O(1) 最近色匹配（首次调用会自动 buildColorLUT）
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{ id: string, name: string, hex: string, type: string, index: number }}
 */
export function nearestColor(r, g, b) {
  if (!lut) buildColorLUT();
  const index = lut[rgbToLutIndex(r & 255, g & 255, b & 255)];
  const c = HAMA_COLORS[index];
  return { id: c.id, name: c.name, hex: c.hex, type: c.type, index };
}

/** 暴力匹配（仅用于校验 LUT 正确性，业务代码勿用） */
export function nearestColorBrute(r, g, b) {
  const rgb = ensurePaletteRgb();
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < HAMA_COLORS.length; i++) {
    const d = weightedDistance(
      r,
      g,
      b,
      rgb[i * 3],
      rgb[i * 3 + 1],
      rgb[i * 3 + 2]
    );
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  const c = HAMA_COLORS[best];
  return { id: c.id, name: c.name, hex: c.hex, type: c.type, index: best };
}

/** 浏览器非模块场景：挂到 globalThis.HamaColorLib */
export function attachToGlobal(target = globalThis) {
  target.HamaColorLib = {
    HAMA_COLORS,
    HAMA_CLASSIC_89,
    colorById,
    hexToRgb,
    weightedDistance,
    LUT_BITS,
    buildColorLUT,
    nearestColor,
    nearestColorBrute,
  };
  return target.HamaColorLib;
}

export default {
  HAMA_COLORS,
  HAMA_CLASSIC_89,
  colorById,
  hexToRgb,
  weightedDistance,
  LUT_BITS,
  buildColorLUT,
  nearestColor,
  nearestColorBrute,
  attachToGlobal,
};
