import React from 'react'
import style from './index.less'

type Div = React.ClassAttributes<HTMLDivElement> &
    React.HTMLAttributes<HTMLDivElement>

interface DirectionProps extends Div {
    mode?: 'row' | 'column'
    type?: 'center' | 'spaceBetween'
    className?: string
    children?: React.ReactNode
}

const Direction = (props: DirectionProps) => {
    const {
        type = 'center',
        mode = 'row',
        className = '',
        children,
        ...otherProps
    } = props

    const defaultClassName = `${mode}-${type}`

    return (
        <div
            className={`${style[defaultClassName]} ${className}`}
            {...otherProps}>
            {children}
        </div>
    )
}

export default Direction
