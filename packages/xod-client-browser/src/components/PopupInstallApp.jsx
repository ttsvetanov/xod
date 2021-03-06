import React from 'react';
import PropTypes from 'prop-types';
import SkyLight from 'react-skylight';

class PopupInstallApp extends React.Component {
  constructor(props) {
    super(props);

    this.popup = null;
    this.assignPopupRef = this.assignPopupRef.bind(this);
  }
  componentWillReceiveProps(nextProps) {
    if (!this.props.isVisible && nextProps.isVisible) {
      this.show();
    }
  }
  show() {
    if (this.popup) {
      this.popup.show();
    }
  }
  hide() {
    if (this.popup) {
      this.popup.hide();
    }
  }

  assignPopupRef(ref) {
    this.popup = ref;
  }

  render() {
    return (
      <SkyLight
        hideOnOverlayClicked
        ref={this.assignPopupRef}
        title="Oops! You need a desktop IDE!"
        afterClose={this.props.onClose}
      >
        <div className="ModalBody">
          <div className="ModalContent">
            To upload projects you need to install XOD IDE for desktop.
          </div>
        </div>
      </SkyLight>
    );
  }
}

PopupInstallApp.propTypes = {
  isVisible: PropTypes.bool,
  onClose: PropTypes.func,
};

export default PopupInstallApp;
