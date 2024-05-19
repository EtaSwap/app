import React from 'react'
import './Stats.css'
import UnderConstruction from '../../assets/img/under-construction.webp';

function Stats() {
    return (
        <div className='stats'>
            <img className='stats__construction' src={UnderConstruction} alt="Under construction"/>
        </div>
    )
}

export default Stats
