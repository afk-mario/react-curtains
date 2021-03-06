import {Children, cloneElement, isValidElement, useState, useEffect} from 'react';
import {ShaderPass} from './ShaderPass';
import {Plane} from './Plane';
import {useCurtains} from '../hooks';
import {RenderTarget as WebGLRenderTarget} from 'curtainsjs';

export function RenderTarget(props) {
    // extract render target parameters from props
    const {
        // render target init parameters
        depth,
        clear,
        minWidth,
        minHeight,
        texturesOptions,

        // custom event
        onReady,

        // whether to apply this render target to all its planes and shader passes children
        autoDetectChildren = true,

        // unique key if created inside a loop
        uniqueKey,
    } = props;

    const [children, setChildren] = useState(null);
    const [renderTarget, setRenderTarget] = useState(null);

    useCurtains((curtains) => {
        let existingRenderTarget = [];
        if(uniqueKey) {
            existingRenderTarget = curtains.renderTargets.filter(target => target._uniqueKey === uniqueKey);
        }

        if(!renderTarget && !existingRenderTarget.length) {
            const webglRenderTarget = new WebGLRenderTarget(curtains, {
                depth,
                clear,
                minWidth,
                minHeight,
                texturesOptions,
            });

            if(uniqueKey) {
                webglRenderTarget._uniqueKey = uniqueKey;
            }

            setRenderTarget(webglRenderTarget);

            onReady && onReady(webglRenderTarget);
        }
        else if(!renderTarget) {
            setRenderTarget(existingRenderTarget[0]);
        }
    });

    useEffect(() => {
        // recursively map through all children and execute a callback on each react element
        const recursiveMap = (children, callback) => {
            // return null if the render target does not have any child
            if(!Children.count(children)) {
                return null;
            }
            else {
                return Children.map(children, child => {
                    if(!isValidElement(child)) {
                        return child;
                    }

                    if(child.props.children) {
                        child = cloneElement(child, {
                            children: recursiveMap(child.props.children, callback)
                        });
                    }

                    return callback(child);
                });
            }
        };

        if(!autoDetectChildren) {
            setChildren(props.children);
        }
        else if(renderTarget) {
            const compChildren = recursiveMap(props.children, child => {
                // our callback
                if(child.type === Plane) {
                    return cloneElement(child, {...child.props, target: renderTarget});
                }
                else if(child.type === ShaderPass) {
                    let augmentedProps = {...child.props, renderTarget: renderTarget};

                    // add uniqueKey if needed and not set
                    if(uniqueKey && !child.props.uniqueKey) {
                        augmentedProps = {...augmentedProps, uniqueKey: uniqueKey}
                    }

                    return cloneElement(child, augmentedProps);
                }
                else {
                    return child;
                }
            });

            setChildren(compChildren);
        }

        return () => {
            if(renderTarget && !renderTarget._shaderPass && renderTarget.textures.length) {
                renderTarget.remove();
            }
        }
    }, [renderTarget, autoDetectChildren]);

    return children;
}