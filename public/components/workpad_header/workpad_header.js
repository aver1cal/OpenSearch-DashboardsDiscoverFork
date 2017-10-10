import React from 'react';
import PropTypes from 'prop-types';
import { Toggle } from '../toggle';
import { FullscreenControl } from '../fullscreen_control';
import { Shortcuts } from 'react-shortcuts';
import './workpad_header.less';

const btnClass = 'canvas__workpad_header--button';

export const WorkpadHeader = ({ workpadName, editing, inFlight, toggleEditing }) => {
  const keyHandler = (action) => {
    if (action === 'EDITING') toggleEditing();
  };

  return (
    <div className="canvas__workpad_header">
      <h2>
        { workpadName }
        <span className={`canvas__workpad_header--editToggle ${btnClass} ${inFlight && 'canvas__in_flight'}`}>
          <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global/>
          <Toggle value={editing} onChange={toggleEditing} />
        </span>
        <FullscreenControl>
          {({ onFullscreen }) => (
            <span className={`canvas__workpad_header--fullscreenControl ${btnClass}`}>
              <i className="fa fa-play" onClick={onFullscreen} />
            </span>
          )}
        </FullscreenControl>
      </h2>
    </div>
  );
};

WorkpadHeader.propTypes = {
  workpadName: PropTypes.string,
  editing: PropTypes.bool,
  inFlight: PropTypes.bool,
  toggleEditing: PropTypes.func,
};
