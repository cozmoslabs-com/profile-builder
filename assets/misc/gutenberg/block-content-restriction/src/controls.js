
import { Fragment } from "react";
import { __ } from "@wordpress/i18n";
import { decodeEntities } from "@wordpress/html-entities";
import {
    BaseControl,
    CheckboxControl,
    SelectControl,
    TextareaControl,
    ToggleControl,
    __experimentalInputControl as InputControl,
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from "@wordpress/components";

export function getRestrictionHelpMessage(wppbContentRestriction, userRoles) {
    let helpMessage = "";
    let rolesSelected = false;

    switch (wppbContentRestriction.display_to) {
        case "all":
            helpMessage = __(
                "This content is not restricted and can be seen by all users.",
                "profile-builder",
            );
            break;
        case "":
            helpMessage = __(
                "This content is restricted and can only be seen by logged in users",
                "profile-builder",
            );
            if (
                wppbContentRestriction.user_roles &&
                wppbContentRestriction.user_roles.length !== 0
            ) {
                rolesSelected = true;

                helpMessage += __(
                    " that have the following user roles: ",
                    "profile-builder",
                );
                wppbContentRestriction.user_roles.map((slug) => {
                    userRoles.map((userRole) => {
                        if (userRole.slug === slug) {
                            helpMessage += userRole.name + ", ";
                        }
                    });
                });
                helpMessage = helpMessage.slice(0, -2);
            }
            if (
                wppbContentRestriction.users_ids &&
                wppbContentRestriction.users_ids.length !== 0
            ) {
                if (rolesSelected) {
                    helpMessage += __(" and", "profile-builder");
                }
                helpMessage += __(
                    " that have the following user IDs: ",
                    "profile-builder",
                );
                helpMessage += wppbContentRestriction.users_ids;
            }
            helpMessage += ".";
            break;
        case "not_logged_in":
            helpMessage = __(
                "This content is restricted and can only be seen by logged out users.",
                "profile-builder",
            );
            break;
        default:
            helpMessage = __("Please select an option.", "profile-builder");
    }

    return helpMessage;
}

export default function WPPBBlockContentRestrictionControlsCommon(props) {
    const { name, attributes, setAttributes } = props;

    // Abort if content restriction is not enabled or if the block type does not have the wppbContentRestriction attribute registered
    if (!("wppbContentRestriction" in attributes)) {
        return null;
    }

    const { wppbContentRestriction } = attributes;

    const userRoles = JSON.parse(wppbBlockEditorData.userRoles);
    const contentRestrictionActivated = JSON.parse(
        wppbBlockEditorData.content_restriction_activated,
    );

    // Abort if content restriction is not enabled
    if (!contentRestrictionActivated) {
        return null;
    }

    // Check if this is one of the Content Restriction blocks so that the 'All Users' option can be hidden
    let contentRestrictionBlock = false;
    if (
        [
            "wppb/content-restriction-start",
            "wppb/content-restriction-end",
        ].includes(name)
    ) {
        contentRestrictionBlock = true;
    }

    let helpMessage = getRestrictionHelpMessage(wppbContentRestriction, userRoles);
    return (
        <>
            <p>{helpMessage}</p>
            <br />
            <ToggleGroupControl
                isBlock
                label={__("Show content to", "profile-builder")}
                value={wppbContentRestriction.display_to}
                onChange={(value) =>
                    setAttributes({
                        wppbContentRestriction: {
                            ...wppbContentRestriction,
                            display_to: value,
                        },
                    })
                }
            >
                {!contentRestrictionBlock && (
                    <ToggleGroupControlOption
                        label={__("All Users", "profile-builder")}
                        value="all"
                    />
                )}
                <ToggleGroupControlOption
                    label={__("Logged In Users", "profile-builder")}
                    value=""
                />
                <ToggleGroupControlOption
                    label={__("Logged Out Users", "profile-builder")}
                    value="not_logged_in"
                />
            </ToggleGroupControl>
            {wppbContentRestriction.display_to == "all" && <p></p>}
            {wppbContentRestriction.display_to == "" && (
                <div>
                    <BaseControl 
                        label={__("User Roles", "profile-builder")}
                        help={__(
                            "The desired valid user roles. Select none for all roles to be valid.",
                            "profile-builder",
                        )}
                    >
                        <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #8c8f94', padding: '8px 12px', borderRadius: '2px', marginBottom: '16px', backgroundColor: '#fff' }}>
                            <style>
                                {`
                                    .wppb-user-role-checkbox {
                                        margin-bottom: 4px !important;
                                    }
                                    .wppb-user-role-checkbox:last-child {
                                        margin-bottom: 0 !important;
                                    }
                                    .wppb-user-role-checkbox .components-checkbox-control__label {
                                        font-size: 13px !important;
                                        line-height: 1.4 !important;
                                    }
                                    .wppb-user-role-checkbox .components-checkbox-control__input-container {
                                        margin-right: 8px !important;
                                    }
                                `}
                            </style>
                            {userRoles?.map((userRole) => {
                                const isChecked = wppbContentRestriction.user_roles ? wppbContentRestriction.user_roles.includes(userRole.slug) : false;
                                return (
                                    <CheckboxControl
                                        key={userRole.slug}
                                        label={decodeEntities(userRole.name)}
                                        checked={isChecked}
                                        className="wppb-user-role-checkbox"
                                        onChange={(checked) => {
                                            const currentRoles = wppbContentRestriction.user_roles ? [...wppbContentRestriction.user_roles] : [];
                                            let newRoles;
                                            if (checked) {
                                                newRoles = [...currentRoles, userRole.slug];
                                            } else {
                                                newRoles = currentRoles.filter(r => r !== userRole.slug);
                                            }
                                            setAttributes({
                                                wppbContentRestriction: {
                                                    ...wppbContentRestriction,
                                                    user_roles: newRoles,
                                                },
                                            });
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </BaseControl>
                    <BaseControl label={__("User IDs", "profile-builder")}>
                        <InputControl
                            help={__(
                                "A comma-separated list of user IDs.",
                                "profile-builder",
                            )}
                            value={wppbContentRestriction.users_ids}
                            onChange={(value) =>
                                setAttributes({
                                    wppbContentRestriction: {
                                        ...wppbContentRestriction,
                                        users_ids: value,
                                    },
                                })
                            }
                            className="components-input-control__input"
                        />
                    </BaseControl>
                    <Fragment>
                        <ToggleControl
                            label={__(
                                "Enable Custom Message",
                                "profile-builder",
                            )}
                            checked={
                                wppbContentRestriction.enable_message_logged_in
                                    ? wppbContentRestriction.enable_message_logged_in
                                    : false
                            }
                            onChange={() =>
                                setAttributes({
                                    wppbContentRestriction: {
                                        ...wppbContentRestriction,
                                        enable_message_logged_in: !wppbContentRestriction.enable_message_logged_in,
                                    },
                                })
                            }
                        />
                        {wppbContentRestriction.enable_message_logged_in && (
                            <TextareaControl
                                help={__(
                                    "Custom message for logged-in users.",
                                    "profile-builder",
                                )}
                                value={wppbContentRestriction.message_logged_in}
                                onChange={(value) =>
                                    setAttributes({
                                        wppbContentRestriction: {
                                            ...wppbContentRestriction,
                                            message_logged_in: value,
                                        },
                                    })
                                }
                            />
                        )}
                    </Fragment>
                </div>
            )}
            {wppbContentRestriction.display_to == "not_logged_in" && (
                <Fragment>
                    <ToggleControl
                        label={__("Enable Custom Message", "profile-builder")}
                        checked={
                            wppbContentRestriction.enable_message_logged_out
                                ? wppbContentRestriction.enable_message_logged_out
                                : false
                        }
                        onChange={() =>
                            setAttributes({
                                wppbContentRestriction: {
                                    ...wppbContentRestriction,
                                    enable_message_logged_out: !wppbContentRestriction.enable_message_logged_out,
                                },
                            })
                        }
                    />
                    {wppbContentRestriction.enable_message_logged_out && (
                        <TextareaControl
                            help={__(
                                "Custom message for logged-out users",
                                "profile-builder",
                            )}
                            value={wppbContentRestriction.message_logged_out}
                            onChange={(value) =>
                                setAttributes({
                                    wppbContentRestriction: {
                                        ...wppbContentRestriction,
                                        message_logged_out: value,
                                    },
                                })
                            }
                        />
                    )}
                </Fragment>
            )}
        </>
    );
}
