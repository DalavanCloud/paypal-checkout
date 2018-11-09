/* @flow */
/** @jsx node */

import { values, min, max, perc } from 'belter/src';
import { node, dom } from 'jsx-pragmatic/src';
import type { RenderOptionsType } from 'zoid/src/component/parent';

import { BUTTON_SIZE, BUTTON_LAYOUT } from '../../constants';
import { BUTTON_SIZE_STYLE, BUTTON_RELATIVE_STYLE, MINIMUM_SIZE, MAXIMUM_SIZE } from '../config';
import type { DimensionsType } from '../../types';
import { determineEligibleFunding } from '../../funding';
import type { ButtonProps } from '../props';

function determineResponsiveSize({ layout, width = 0 }) : $Values<typeof BUTTON_SIZE> {

    const minimumSize = MINIMUM_SIZE[layout];
    const maximumSize = MAXIMUM_SIZE[layout];

    if (width < BUTTON_SIZE_STYLE[minimumSize].minWidth) {
        return minimumSize;
    }

    if (width >= BUTTON_SIZE_STYLE[maximumSize].maxWidth) {
        return maximumSize;
    }

    for (const size of Object.keys(BUTTON_SIZE_STYLE)) {
        const { minWidth, maxWidth } = BUTTON_SIZE_STYLE[size];

        if (width >= minWidth && width < maxWidth) {
            return size;
        }
    }

    throw new Error(`Unable to calculate responsive size for width: ${ width }`);
}

function getDimensions({ label, size, tagline, layout, number, viewport, height: buttonHeight }) : DimensionsType {

    if (size === BUTTON_SIZE.RESPONSIVE) {
        size = determineResponsiveSize({ label, layout, width: viewport.width, height: buttonHeight });
    }

    const { defaultWidth, defaultHeight, minHeight, maxHeight, allowTagline } = BUTTON_SIZE_STYLE[size];

    buttonHeight = buttonHeight || min(max(defaultHeight, minHeight), maxHeight);

    const width = defaultWidth;
    let height = buttonHeight;

    if (tagline && allowTagline) {
        height += perc(buttonHeight, BUTTON_RELATIVE_STYLE.TAGLINE);
    } else if (layout === BUTTON_LAYOUT.VERTICAL) {
        height = (buttonHeight * number) + (perc(buttonHeight, BUTTON_RELATIVE_STYLE.VERTICAL_MARGIN) * (number - 1));
    }

    return { width, height };
}

export function containerTemplate({ id, props, CLASS, on, container, tag, context, outlet, document } : RenderOptionsType<ButtonProps>) : HTMLElement {

    const { style, remembered, platform, fundingEligibility } = props;
    const sources = determineEligibleFunding({ style, remembered, platform, fundingEligibility });
    const { label, tagline, layout, height: buttonHeight } = style;

    const size = BUTTON_SIZE.RESPONSIVE;

    const getContainerDimensions = () => {
        let cont = container;

        while (cont.offsetWidth === 0 && cont.parentElement && cont.parentElement !== cont) {
            cont = cont.parentElement;
        }

        return getDimensions({
            // $FlowFixMe
            viewport: { width: cont.offsetWidth, height: cont.offsetHeight },
            number:   sources.length,
            height:   buttonHeight,
            label,
            size,
            tagline,
            layout
        });
    };

    const { width, height } = getContainerDimensions();

    if (size === BUTTON_SIZE.RESPONSIVE) {
        on('resize', () => {
            outlet.style.height = `${ getContainerDimensions().height }px`;
        });
    }

    let minimumSize = MINIMUM_SIZE[layout];
    let maximumSize = MAXIMUM_SIZE[layout];
    
    if (buttonHeight) {
        const possibleSizes = values(BUTTON_SIZE).filter(possibleSize => {
            return BUTTON_SIZE_STYLE[possibleSize] && buttonHeight &&
                BUTTON_SIZE_STYLE[possibleSize].minHeight <= buttonHeight && BUTTON_SIZE_STYLE[possibleSize].maxHeight >= buttonHeight;
        });

        possibleSizes.sort((sizeA : $Values<typeof BUTTON_SIZE>, sizeB : $Values<typeof BUTTON_SIZE>) : number => {
            return BUTTON_SIZE_STYLE[sizeA].defaultWidth - BUTTON_SIZE_STYLE[sizeB].defaultWidth;
        });

        minimumSize = possibleSizes[0];
        maximumSize = possibleSizes[possibleSizes.length - 1];
    }

    return (
        <div id={ id } class={ `${ tag } ${ tag }-context-${ context } ${ tag }-label-${ label } ${ tag }-size-${ size } ${ tag }-layout-${ layout }` }>

            <style>
                {`
                    #${ id } {
                        font-size: 0;
                        width: 100%;
                    }

                    #${ id }.${ tag }-size-${ BUTTON_SIZE.RESPONSIVE } {
                        text-align: center;
                    }

                    #${ id } > .${ CLASS.OUTLET } {
                        display: inline-block;
                        min-width: ${ BUTTON_SIZE_STYLE[minimumSize].minWidth }px;
                        max-width: ${ BUTTON_SIZE_STYLE[maximumSize].maxWidth }px;
                        position: relative;
                    }

                    #${ id }.${ tag }-layout-${ BUTTON_LAYOUT.VERTICAL } > .${ CLASS.OUTLET } {
                        min-width: ${ BUTTON_SIZE_STYLE[minimumSize].minWidth }px;
                    }

                    #${ id } > .${ CLASS.OUTLET } {
                        width:  ${ width }px;
                        height: ${ height }px;
                    }

                     #${ id }.${ tag }-size-${ BUTTON_SIZE.RESPONSIVE } > .${ CLASS.OUTLET } {
                        width: 100%;
                    }

                    #${ id } > .${ CLASS.OUTLET } > iframe {
                        min-width: 100%;
                        max-width: 100%;
                        width: ${ BUTTON_SIZE_STYLE[minimumSize].minWidth }px;
                        height: 100%;
                        position: absolute;
                        top: 0;
                        left: 0;
                    }

                    #${ id } > .${ CLASS.OUTLET } > iframe.${ CLASS.COMPONENT_FRAME } {
                        z-index: 100;
                    }

                    #${ id } > .${ CLASS.OUTLET } > iframe.${ CLASS.PRERENDER_FRAME } {
                        transition: opacity .2s linear;
                        z-index: 200;
                    }

                    #${ id } > .${ CLASS.OUTLET } > iframe.${ CLASS.VISIBLE } {
                        opacity: 1;
                    }

                    #${ id } > .${ CLASS.OUTLET } > iframe.${ CLASS.INVISIBLE } {
                        opacity: 0;
                        pointer-events: none;
                    }
                `}
            </style>

            <node el={ outlet } />
        </div>
    ).render(dom({ doc: document }));
}