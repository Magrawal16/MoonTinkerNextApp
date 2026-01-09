// elementOverlap.ts
// Utility to detect if circuit elements overlap, used for hiding nodes
// of lower-layer elements when visually covered by elements above them.

import { CircuitElement } from "../types/circuit";
import { getElementCenter, getAbsoluteNodePosition } from "./rotationUtils";
import { getBatteryCollisionRect } from "@/circuit_canvas/utils/batteryCollisionMap";


function getElementSize(type: string): { width: number; height: number } {
  // These sizes represent the actual visual body of elements (excluding wires, cables, etc.)
  // Tuned to match the core opaque/solid parts of each SVG
  const sizeMap: Record<string, { width: number; height: number }> = {
    battery: { width: 80, height: 90 },
    cell3v: { width: 110, height: 160 },
    AA_battery: { width: 60, height: 200 },
    AAA_battery: { width: 50, height: 180 },
    powersupply: { width: 160, height: 120 },
    lightbulb: { width: 145, height: 145 }, // Just the bulb body, not the base terminals
    resistor: { width: 95, height: 65 },
    multimeter: { width: 165, height: 80 },
    potentiometer: { width: 50, height: 35 },
    led: { width: 75, height: 95 },
    // Microbit: only the main board body (not including connector area)
    microbit: { width: 100, height: 50 },
    microbitWithBreakout: { width: 210, height: 180 },
    ultrasonicsensor4p: { width: 210, height: 90 },
    pushbutton: { width: 61, height: 81 },
  };
  return sizeMap[type] || { width: 100, height: 100 };
}

/**
 * Get collision regions for elements that have multiple distinct visual parts.
 * Returns array of collision regions (either rects or paths) relative to element center.
 */
export type CollisionRegion = 
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'path'; data: string; x: number; y: number; scaleX: number; scaleY: number };

export function getElementRegions(
  element: CircuitElement
): Array<CollisionRegion> {
  const center = getElementCenter(element);
  
  // Special handling for microbit: separate board and USB connector regions
  if (element.type === "microbit") {
    return [
      // USB connector at top (GREEN box in debug view)
      {
        type: 'rect',
        x: element.x - center.x + 97,
        y: element.y - center.y - 1,
        width: 27,
        height: 75,
      },
      // Main board body (MAGENTA box in debug view)
      {
        type: 'rect',
        x: element.x - center.x + 25,
        y: element.y - center.y + 98,
        width: 170,
        height: 130,
      },
    ];
  }
  
  if (element.type === "microbitWithBreakout") {
    return [
      // Main board body (GREEN box in debug view)
      {
        type: 'rect',
        x: element.x - center.x + 95,
        y: element.y - center.y - 65,
        width: 34,
        height: 75,
      },
      // Connector/pins area at bottom (MAGENTA box in debug view)
      {
        type: 'rect',
        x: element.x - center.x + 30,
        y: element.y - center.y + 20,
        width: 160,
        height: 220,
      },
      {
        type: 'rect',
        x: element.x - center.x + 10,
        y: element.y - center.y + 130,
        width: 210,
        height: 25,
      },
    ];
  }
  
  if (element.type === "battery") {
    return [
      {
        type: 'rect',
        x: element.x - center.x + 9,
        y: element.y - center.y + 29.5,
        width: 102,
        height: 130,
      },
    ];
  }
  
  if (element.type === "cell3v") {
    return [
      {
        type: 'path',
        // Exact SVG path from RenderElement.tsx yellow overlay
        data: "M0 0 C3 0.25 3 0.25 5 2.25 C5.44921875 4.125 5.44921875 4.125 5.6875 6.25 C5.77386719 6.95125 5.86023438 7.6525 5.94921875 8.375 C6 10.25 6 10.25 5 12.25 C6.65 12.91 8.3 13.57 10 14.25 C10 17.55 10 20.85 10 24.25 C11.32 24.58 12.64 24.91 14 25.25 C15.20029908 27.65059817 15.11459743 29.14360649 15.09765625 31.8203125 C15.09443359 32.71621094 15.09121094 33.61210938 15.08789062 34.53515625 C15.07951172 35.47230469 15.07113281 36.40945312 15.0625 37.375 C15.05798828 38.31988281 15.05347656 39.26476563 15.04882812 40.23828125 C15.03702357 42.57558387 15.02055759 44.91276061 15 47.25 C16.0372522 47.24214478 16.0372522 47.24214478 17.09545898 47.23413086 C20.20946352 47.213425 23.32345361 47.20036037 26.4375 47.1875 C27.52611328 47.17912109 28.61472656 47.17074219 29.73632812 47.16210938 C30.77080078 47.15888672 31.80527344 47.15566406 32.87109375 47.15234375 C33.82943115 47.14710693 34.78776855 47.14187012 35.77514648 47.13647461 C38 47.25 38 47.25 39 48.25 C39.08669432 49.7387186 39.10703494 51.231445 39.09765625 52.72265625 C39.09443359 53.62177734 39.09121094 54.52089844 39.08789062 55.44726562 C39.07951172 56.39279297 39.07113281 57.33832031 39.0625 58.3125 C39.05798828 59.26189453 39.05347656 60.21128906 39.04882812 61.18945312 C39.0370011 63.54303065 39.02052025 65.89648477 39 68.25 C39.68940674 68.36190674 40.37881348 68.47381348 41.08911133 68.58911133 C60.38222401 71.79415611 78.72624289 78.32695458 95.38671875 88.6484375 C98.01433441 90.25878492 100.69532207 91.65806552 103.4375 93.0625 C109.600588 96.39269885 114.98573294 100.62623325 120.42773438 104.99511719 C121.95449168 106.21367814 123.50045983 107.4080472 125.046875 108.6015625 C126.41585937 109.66503906 126.41585937 109.66503906 127.8125 110.75 C128.62332031 111.3790625 129.43414062 112.008125 130.26953125 112.65625 C130.84058594 113.1821875 131.41164063 113.708125 132 114.25 C132 114.91 132 115.57 132 116.25 C133.32 116.91 134.64 117.57 136 118.25 C136 118.91 136 119.57 136 120.25 C136.55558594 120.47300781 137.11117188 120.69601563 137.68359375 120.92578125 C151.57683844 128.86812518 162.21297249 148.74765415 169.90283203 162.31982422 C170.63659926 163.61069287 171.37986226 164.89620812 172.13232422 166.17626953 C188.01554175 193.26240467 195.33472895 226.28574932 195.30078125 257.48046875 C195.30468576 259.00678113 195.30902389 260.53309246 195.31376648 262.05940247 C195.32116574 265.23861226 195.32098463 268.41771091 195.31567383 271.59692383 C195.31104689 274.81516511 195.31795127 278.03302817 195.33618164 281.2512207 C195.52851016 315.50683642 195.52851016 315.50683642 192 331.25 C191.79592529 332.21333252 191.59185059 333.17666504 191.3815918 334.16918945 C190.87484693 336.40548141 190.3079873 338.60547681 189.6875 340.8125 C189.47585205 341.58440674 189.2642041 342.35631348 189.04614258 343.15161133 C188.38359592 345.52390915 187.6977145 347.88782252 187 350.25 C186.77441406 351.01731445 186.54882812 351.78462891 186.31640625 352.57519531 C183.16328962 363.09894476 179.1282524 372.82202959 173.9375 382.50146484 C173.08951233 384.08305018 172.2622488 385.6757042 171.4375 387.26953125 C163.80333776 401.7702905 154.00004157 416.00874326 142 427.25 C139.58898682 429.63387959 137.20587786 432.03042232 134.88671875 434.50390625 C113.4506969 457.00601799 83.36118854 473.18240794 53.5 481 C52.32179688 481.31582031 51.14359375 481.63164062 49.9296875 481.95703125 C41.29383117 484.25 41.29383117 484.25 39 484.25 C39 494.81 39 505.37 39 516.25 C36.05868109 517.23043964 34.17498335 517.36621202 31.11328125 517.34765625 C30.17548828 517.34443359 29.23769531 517.34121094 28.27148438 517.33789062 C27.29501953 517.32951172 26.31855469 517.32113281 25.3125 517.3125 C24.32443359 517.30798828 23.33636719 517.30347656 22.31835938 517.29882812 C19.87884526 517.28704303 17.43945311 517.27059011 15 517.25 C15.04640625 518.55195312 15.0928125 519.85390625 15.140625 521.1953125 C15.17815847 522.92185196 15.21455693 524.64841636 15.25 526.375 C15.28351563 527.2309375 15.31703125 528.086875 15.3515625 528.96875 C15.44000747 534.71767294 14.57856857 537.55702226 11 542.25 C10.43567549 544.45194359 10.43567549 544.45194359 10.4375 546.5 C10.293125 547.7375 10.14875 548.975 10 550.25 C9.01 550.91 8.02 551.57 7 552.25 C6.3121764 554.60367713 6.3121764 554.60367713 6 557.25 C5.625 559.9375 5.625 559.9375 5 562.25 C1.78697711 564.39201526 0.73290719 564.90325876 -3 564.25 C-5.69352006 561.27783994 -6.17370973 558.81946196 -6.1875 554.9375 C-6.125625 553.720625 -6.06375 552.50375 -6 551.25 C-6.639375 551.085 -7.27875 550.92 -7.9375 550.75 C-8.618125 550.255 -9.29875 549.76 -10 549.25 C-10.5 545.4375 -10.5 545.4375 -10.53125 543.41796875 C-10.85495629 541.04317882 -10.85495629 541.04317882 -12.984375 539.0703125 C-15.8183878 535.10489149 -15.66729111 531.70078023 -15.75 526.9375 C-15.77964844 526.10154297 -15.80929688 525.26558594 -15.83984375 524.40429688 C-15.91016107 522.35337515 -15.95738973 520.30168438 -16 518.25 C-16.62567871 518.22494385 -17.25135742 518.1998877 -17.89599609 518.17407227 C-20.72254619 518.05824727 -23.54875169 517.93546015 -26.375 517.8125 C-27.85226563 517.75352539 -27.85226563 517.75352539 -29.359375 517.69335938 C-30.77089844 517.63051758 -30.77089844 517.63051758 -32.2109375 517.56640625 C-33.08024902 517.52974854 -33.94956055 517.49309082 -34.84521484 517.45532227 C-37 517.25 -37 517.25 -39 516.25 C-40.08694899 512.45146704 -40.11628684 508.78652241 -40.09765625 504.85546875 C-40.09443359 503.65341797 -40.09121094 502.45136719 -40.08789062 501.21289062 C-40.07951172 499.96701172 -40.07113281 498.72113281 -40.0625 497.4375 C-40.05798828 496.17228516 -40.05347656 494.90707031 -40.04882812 493.60351562 C-40.03706251 490.4856289 -40.02062272 487.36783867 -40 484.25 C-41.0415625 484.01925781 -42.083125 483.78851563 -43.15625 483.55078125 C-57.74930321 480.26261743 -71.31306933 476.27809889 -84.875 469.875 C-86.30126709 469.20585571 -86.30126709 469.20585571 -87.75634766 468.52319336 C-93.46506377 465.75051646 -98.6181529 462.60978132 -103.73364258 458.85205078 C-106.02214282 457.2343476 -108.36214085 455.85695608 -110.8125 454.5 C-117.51169105 450.54758212 -123.20696501 445.39244325 -129 440.25 C-129.51884766 439.79431641 -130.03769531 439.33863281 -130.57226562 438.86914062 C-146.54102018 424.80770872 -159.16003271 409.10819096 -169.64990234 390.5925293 C-170.6393252 388.87580012 -171.65372148 387.17339947 -172.68212891 385.47973633 C-176.87853971 378.51433108 -180.24133409 371.53745284 -183.125 363.9375 C-183.76501953 362.25841553 -183.76501953 362.25841553 -184.41796875 360.54541016 C-204.29638337 306.64724697 -202.5159874 231.3100624 -178.8515625 179.22216797 C-171.1361623 162.77405472 -162.38173602 147.59406648 -150.41015625 133.89257812 C-148.40944627 131.56211123 -146.55558887 129.12477219 -144.6875 126.6875 C-141.86486051 123.16503254 -138.93113169 120.17727334 -135.4609375 117.296875 C-133.4322844 115.60955083 -131.45044769 113.89079627 -129.4765625 112.140625 C-120.92603077 104.57823159 -112.49844433 98.03381258 -102.42773438 92.59765625 C-100.04359933 91.27420236 -97.73033664 89.86960885 -95.41015625 88.4375 C-79.70127991 78.99802076 -58.78575403 68.25 -40 68.25 C-39.96241577 67.34906616 -39.96241577 67.34906616 -39.92407227 66.42993164 C-39.8084472 63.72388563 -39.68557064 61.01821717 -39.5625 58.3125 C-39.52318359 57.36697266 -39.48386719 56.42144531 -39.44335938 55.44726562 C-39.40146484 54.54814453 -39.35957031 53.64902344 -39.31640625 52.72265625 C-39.26141968 51.47367554 -39.26141968 51.47367554 -39.20532227 50.19946289 C-39 48.25 -39 48.25 -38 47.25 C-36.29227642 47.16286169 -34.58101351 47.14299993 -32.87109375 47.15234375 C-31.31938477 47.15717773 -31.31938477 47.15717773 -29.73632812 47.16210938 C-28.64771484 47.17048828 -27.55910156 47.17886719 -26.4375 47.1875 C-24.7987793 47.19426758 -24.7987793 47.19426758 -23.12695312 47.20117188 C-20.41791505 47.21300174 -17.70898401 47.22948457 -15 47.25 C-15.01047363 46.62432129 -15.02094727 45.99864258 -15.03173828 45.35400391 C-15.07323191 42.5277099 -15.09930473 39.70147989 -15.125 36.875 C-15.14175781 35.89015625 -15.15851563 34.9053125 -15.17578125 33.890625 C-15.18222656 32.94960938 -15.18867188 32.00859375 -15.1953125 31.0390625 C-15.20578613 30.16975098 -15.21625977 29.30043945 -15.22705078 28.40478516 C-15 26.25 -15 26.25 -13 24.25 C-12.01 24.25 -11.02 24.25 -10 24.25 C-10.04640625 23.65832031 -10.0928125 23.06664063 -10.140625 22.45703125 C-10.4014781 16.74621152 -9.75043545 14.68233281 -6 10.25 C-5.53998083 8.22520786 -5.53998083 8.22520786 -5.375 6.0625 C-4.92515139 1.48903908 -4.64694729 0.38724561 0 0 Z",
        x: element.x - center.x + 55,
        y: element.y - center.y + 5,
        scaleX: 0.28,
        scaleY: 0.25,
      },
    ];
  }
  
  if (element.type === "AA_battery") {
    const batteryCount = (element.properties?.batteryCount as number) || 1;
    const formFactor = ((element.properties as any)?.batteryType === 'AAA' ? 'AAA' : 'AA') as 'AA' | 'AAA';
    const rect = getBatteryCollisionRect(formFactor, batteryCount);
    return [
      {
        type: 'rect',
        x: element.x - center.x + rect.x,
        y: element.y - center.y + rect.y,
        width: rect.width,
        height: rect.height,
      },
    ];
  }
  
  if (element.type === "AAA_battery") {
    const batteryCount = (element.properties?.batteryCount as number) || 1;
    const formFactor = ((element.properties as any)?.batteryType === 'AAA' ? 'AAA' : 'AA') as 'AA' | 'AAA';

    const rect = getBatteryCollisionRect(formFactor, batteryCount);
    return [
      {
        type: 'rect',
        x: element.x - center.x + rect.x,
        y: element.y - center.y + rect.y,
        width: rect.width,
        height: rect.height,
      },
    ];
  }
  
  if (element.type === "powersupply") {
    return [
      {
        type: 'rect',
        x: element.x - center.x + 0,
        y: element.y - center.y + 0,
        width: 160,
        height: 125,
      },
    ];
  }
  
  if (element.type === "lightbulb") {
    return [
      {
        type: 'path',
        // Exact SVG path from RenderElement.tsx yellow overlay
        data: "M0 0 C11.00160657 9.19861186 16.9945925 21.8355298 18.26171875 36.02734375 C19.30657126 55.25916031 10.3112907 69.74031881 -0.515625 84.89453125 C-3.38980797 88.94566436 -3.87616381 90.63197162 -3.86328125 95.52734375 C-3.86585937 96.50703125 -3.8684375 97.48671875 -3.87109375 98.49609375 C-3.90768178 101.02165429 -3.90768178 101.02165429 -2.73828125 103.02734375 C-2.43918907 107.22948577 -2.46007704 111.44082093 -2.42578125 115.65234375 C-2.38227539 117.39837891 -2.38227539 117.39837891 -2.33789062 119.1796875 C-2.28254209 126.69857366 -2.64907327 132.8526423 -8.1862793 138.50561523 C-10.29201643 140.31588005 -12.51136276 141.88442271 -14.859375 143.36328125 C-17.23624304 145.46836604 -17.38556384 146.73287208 -17.80078125 149.83984375 C-18.48357308 154.04116644 -19.58380059 157.30596807 -21.73828125 161.02734375 C-22.72828125 160.69734375 -23.71828125 160.36734375 -24.73828125 160.02734375 C-25.90625 157.0859375 -25.90625 157.0859375 -26.92578125 153.46484375 C-27.26996094 152.26730469 -27.61414063 151.06976563 -27.96875 149.8359375 C-28.22269531 148.90910156 -28.47664063 147.98226562 -28.73828125 147.02734375 C-30.38828125 146.69734375 -32.03828125 146.36734375 -33.73828125 146.02734375 C-33.84140625 147.20296875 -33.94453125 148.37859375 -34.05078125 149.58984375 C-34.56743083 153.85220278 -35.88911735 157.16821909 -37.73828125 161.02734375 C-40.73828125 160.02734375 -40.73828125 160.02734375 -41.65234375 158.20703125 C-41.88695312 157.44648438 -42.1215625 156.6859375 -42.36328125 155.90234375 C-42.74806641 154.68417969 -42.74806641 154.68417969 -43.140625 153.44140625 C-43.73828125 151.02734375 -43.73828125 151.02734375 -43.92578125 147.27734375 C-44.38883211 144.03260391 -44.38883211 144.03260391 -46.3984375 142.6953125 C-47.80686653 141.86605055 -49.22940423 141.06035293 -50.6640625 140.27734375 C-54.18539109 138.15526249 -57.00062092 135.17648316 -58.35888672 131.21923828 C-58.83675211 128.45844323 -58.86809936 125.8218557 -58.87109375 123.01953125 C-58.87238281 121.86839844 -58.87367187 120.71726563 -58.875 119.53125 C-58.87113281 118.33371094 -58.86726563 117.13617188 -58.86328125 115.90234375 C-58.86908203 114.09443359 -58.86908203 114.09443359 -58.875 112.25 C-58.87371094 111.10144531 -58.87242188 109.95289063 -58.87109375 108.76953125 C-58.86996582 107.71620605 -58.86883789 106.66288086 -58.86767578 105.57763672 C-58.73828125 103.02734375 -58.73828125 103.02734375 -57.73828125 101.02734375 C-56.49870627 93.0405368 -58.22158889 88.16024414 -62.8046875 81.640625 C-63.44277344 80.77824219 -64.08085938 79.91585937 -64.73828125 79.02734375 C-75.16351396 64.14513195 -81.5263192 49.78910983 -79.05078125 31.27734375 C-76.43516307 17.0807319 -69.35968473 5.68328565 -57.73828125 -2.97265625 C-39.66656975 -14.0531217 -16.91288552 -12.18403307 0 0 Z",
        x: element.x - center.x + 99,
        y: element.y - center.y + 20,
        scaleX: 0.8,
        scaleY: 0.8,
      },
    ];
  }
  
  if (element.type === "resistor") {
    return [
      {
        type: 'path',
        // Exact SVG path from RenderElement.tsx yellow overlay
        data: "m0 0 22 1 25 5 21 7 21 10 16 11 13 11 13 12 10 11 11 14 10 13 28 40 12 16 8 9 9 4 28 7 14 2 250 1 10 4 9 6 7 7 6 10 4 12v16l-5 12-7 10-7 7-11 6-10 2-245 1-22 3-20 5-9 5-5 4-11 14-11 16-9 13-11 16-10 13-7 9-11 13-7 8-16 16-14 10-18 10-13 6-21 7-16 3-9 1h-39l-38-4-26-5-20-6-19-7-29-11-29-9-20-5-12-2-12-1-59-1h-281l-29 1-20 3-28 8-29 10-31 11-26 7-28 5-28 3h-40l-17-3-21-7-17-8-19-12-14-12-11-10-7-8-10-11-14-19-14-20-16-24-10-13-7-8-10-6-21-5-21-3-255-1-12-3-11-7-8-8-7-14-2-11 1-14 4-11 6-9 7-7 11-6 5-2 248-1 31-3 18-4 12-4 8-7 26-36 11-16 12-17 10-13 12-14 14-14 8-7 17-13 18-10 17-7 21-5 13-2h39l41 6 26 6 17 5 30 11 20 7 27 8 20 4 17 2 19 1h324l22-1 28-6 36-12 17-6 36-13 23-6 33-5 10-1z",
        x: element.x - center.x + 42,
        y: element.y - center.y + 41.5,
        scaleX: 0.026,
        scaleY: 0.038,
      },
    ];
  }
  
  if (element.type === "multimeter") {
    return [
      {
        type: 'rect',
        x: element.x - center.x + 12,
        y: element.y - center.y + 32,
        width: 156,
        height: 48,
      },
    ];
  }
  
  if (element.type === "potentiometer") {
    return [
      {
        type: 'path',
        // Exact SVG path from RenderElement.tsx yellow overlay (circular shape)
        data: "M50,5 a45,45 0 1,0 0.00001,0",
        x: element.x - center.x - 6,
        y: element.y - center.y + 11,
        scaleX: 0.65,
        scaleY: 0.65,
      },
    ];
  }
  
  if (element.type === "led") {
    return [
      {
        type: 'path',
        // Exact SVG path from RenderElement.tsx yellow overlay
        data: "M0 0 C4.4054149 3.25617623 6.18908263 6.68610617 7 12 C7.30969711 15.17338987 7.56042289 18.34083364 7.75390625 21.5234375 C7.73000361 23.941244 7.73000361 23.941244 9 25 C8.65908345 29.6023734 8.30111479 31.84893588 5 35 C5.22843552 37.36050038 5.90776314 38.8462719 7.125 40.875 C8.34009711 43.82595012 7.69349619 45.94861675 7 49 C5.125 48.875 5.125 48.875 3 48 C1.875 45.0625 1.875 45.0625 1 42 C0.34 41.34 -0.32 40.68 -1 40 C-1 39.01 -1 38.02 -1 37 C-1.94875 37.185625 -2.8975 37.37125 -3.875 37.5625 C-7 38 -7 38 -9 37 C-9 40.63 -9 44.26 -9 48 C-10.98 48.495 -10.98 48.495 -13 49 C-15.21305911 46.78694089 -14.45329198 41.78059633 -14.62109375 38.78515625 C-14.7322894 35.86415567 -14.7322894 35.86415567 -17 34 C-17.49014663 29.41445173 -17.37041649 24.79622107 -17.375 20.1875 C-17.39949219 18.90294922 -17.42398437 17.61839844 -17.44921875 16.29492188 C-17.45308594 15.05677734 -17.45695312 13.81863281 -17.4609375 12.54296875 C-17.46915527 11.40883545 -17.47737305 10.27470215 -17.48583984 9.10620117 C-16.89627996 5.3368693 -15.62979866 3.7109728 -13 1 C-8.79204289 -1.57152935 -4.60942815 -1.42761641 0 0 Z ",
        x: element.x - center.x + 30,
        y: element.y - center.y + 1,
        scaleX: 1.4,
        scaleY: 1.3,
      },
    ];
  }
  
  if (element.type === "ultrasonicsensor4p") {
    return [
      {
        type: 'path',
        // Exact SVG path from RenderElement.tsx yellow overlay
        data : "M 0.230469 0 L 447 0 L 447 313 L 0.230469 313 Z M 0.230469 0",
        x: element.x - center.x + 5,
        y: element.y - center.y + 21,
        scaleX: 0.38,
        scaleY: 0.22,
      },
    ];
  }
  
  if (element.type === "pushbutton") {
    return [
      {
        type: 'rect',
        x: element.x - center.x,
        y: element.y - center.y,
        width: 61,
        height: 81,
      },
    ];
  }
  
  // Default: single region for the whole element
  const size = getElementSize(element.type);
  return [
    {
      type: 'rect',
      x: element.x - center.x,
      y: element.y - center.y,
      width: size.width,
      height: size.height,
    },
  ];
}

/**
 * Check if two axis-aligned bounding boxes overlap.
 */
function boxesOverlap(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

function isPointInPath(
  point: { x: number; y: number },
  pathData: string,
  pathX: number,
  pathY: number,
  scaleX: number,
  scaleY: number
): boolean {
  // Transform point to path's local coordinate system
  const localX = (point.x - pathX) / scaleX;
  const localY = (point.y - pathY) / scaleY;
  
  // Create a temporary canvas for path detection
  if (typeof document === 'undefined') return false; // Server-side rendering guard
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  
  const path = new Path2D(pathData);
  return ctx.isPointInPath(path, localX, localY);
}


function isPointInRegion(
  point: { x: number; y: number },
  region: CollisionRegion
): boolean {
  if (region.type === 'rect') {
    return (
      point.x >= region.x &&
      point.x <= region.x + region.width &&
      point.y >= region.y &&
      point.y <= region.y + region.height
    );
  } else if (region.type === 'path') {
    return isPointInPath(point, region.data, region.x, region.y, region.scaleX, region.scaleY);
  }
  return false;
}


export function getOverlappingElements(
  element: CircuitElement,
  allElements: CircuitElement[]
): string[] {
  const targetIndex = allElements.findIndex((e) => e.id === element.id);
  if (targetIndex === -1) return [];

  const center = getElementCenter(element);
  const size = getElementSize(element.type);
  
  const targetBox = {
    x: element.x - center.x,
    y: element.y - center.y,
    width: size.width,
    height: size.height,
  };

  const covering: string[] = [];

  // Check all elements that come AFTER this one (higher z-index)
  for (let i = targetIndex + 1; i < allElements.length; i++) {
    const other = allElements[i];
    const otherCenter = getElementCenter(other);
    const otherSize = getElementSize(other.type);
    const otherBox = {
      x: other.x - otherCenter.x,
      y: other.y - otherCenter.y,
      width: otherSize.width,
      height: otherSize.height,
    };

    if (boxesOverlap(targetBox, otherBox)) {
      covering.push(other.id);
    }
  }

  return covering;
}


export function shouldHideNode(
  nodeParentId: string,
  nodeId: string,
  allElements: CircuitElement[]
): boolean {
  const parentIndex = allElements.findIndex((e) => e.id === nodeParentId);
  if (parentIndex === -1) return false;

  const parent = allElements[parentIndex];
  const node = parent.nodes.find((n) => n.id === nodeId);
  if (!node) return false;

  // Get absolute node position using proper rotation calculation
  const absolutePos = getAbsoluteNodePosition(node, parent);

  // Check if any element that comes AFTER parent (higher z-index) covers this node
  for (let i = parentIndex + 1; i < allElements.length; i++) {
    const other = allElements[i];

    // Get all collision regions for the covering element (handles multi-part elements)
    const regions = getElementRegions(other);
    // Check if node falls within ANY region of the covering element
    for (const region of regions) {
      if (isPointInRegion(absolutePos, region)) {
        return true;
      }
    }
  }

  return false;
}
