// External Dependencies
import React from "react";
import AjaxComponent from "./../base/AjaxComponent/AjaxComponent";

// Internal Dependencies
import "./style.css";

class RecoverPassword extends AjaxComponent {
  static slug = "wppb_recover_password";

  _shouldReload(oldProps, newProps) {
    return false;
  }

  _reloadFormData(props) {
    var formData = new FormData();

    formData.append("action", "wppb_divi_extension_ajax");
    formData.append("form_type", "rp");

    return formData;
  }

  render() {
    return super.render();
  }

  _render() {
    return (
      <div
        className="wppb-form-container"
        dangerouslySetInnerHTML={{ __html: this.state.result }}
      />
    );
  }
}

export default RecoverPassword;
