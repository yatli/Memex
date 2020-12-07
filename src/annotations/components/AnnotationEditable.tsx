import * as React from 'react'
import styled, { ThemeProvider } from 'styled-components'
import ItemBox from '@worldbrain/memex-common/lib/common-ui/components/item-box'
import ItemBoxBottom from '@worldbrain/memex-common/lib/common-ui/components/item-box-bottom'

import * as icons from 'src/common-ui/components/design-library/icons'
import niceTime from 'src/util/nice-time'
import { AnnotationMode } from 'src/sidebar/annotations-sidebar/types'
// import { CrowdfundingBox } from 'src/common-ui/crowdfunding'
import AnnotationView from 'src/annotations/components/AnnotationView'
import AnnotationFooter, {
    AnnotationFooterEventProps,
} from 'src/annotations/components/AnnotationFooter'
import AnnotationEdit, {
    AnnotationEditGeneralProps,
    AnnotationEditEventProps,
} from 'src/annotations/components/AnnotationEdit'
import TextTruncated from 'src/annotations/components/parts/TextTruncated'
import { GenericPickerDependenciesMinusSave } from 'src/common-ui/GenericPicker/logic'
import { SidebarAnnotationTheme, SelectionIndices } from '../types'
import {
    AnnotationSharingInfo,
    AnnotationSharingAccess,
} from 'src/content-sharing/ui/types'

export interface AnnotationEditableGeneralProps {}

export interface AnnotationEditableProps {
    /** Required to decide how to go to an annotation when it's clicked. */
    url: string
    sharingInfo: AnnotationSharingInfo
    sharingAccess: AnnotationSharingAccess
    className?: string
    isActive?: boolean
    isHovered?: boolean
    isClickable?: boolean
    createdWhen: Date
    lastEdited: Date
    body?: string
    comment?: string
    tags: string[]
    isBookmarked?: boolean
    mode: AnnotationMode
    tagPickerDependencies: GenericPickerDependenciesMinusSave
    annotationFooterDependencies: AnnotationFooterEventProps
    annotationEditDependencies: AnnotationEditGeneralProps &
        AnnotationEditEventProps
    renderCopyPasterForAnnotation: (id: string) => JSX.Element
    renderShareMenuForAnnotation: (id: string) => JSX.Element
}

export interface AnnotationEditableEventProps {
    onGoToAnnotation: (url: string) => void
    onMouseEnter?: (url: string) => void
    onMouseLeave?: (url: string) => void
}

export type Props = AnnotationEditableGeneralProps &
    AnnotationEditableProps &
    AnnotationEditableEventProps

export default class AnnotationEditable extends React.Component<Props> {
    private annotEditRef = React.createRef<AnnotationEdit>()
    private boxRef: HTMLDivElement = null
    private removeEventListeners?: () => void
    private cursorIndices: SelectionIndices

    static defaultProps: Partial<Props> = {
        mode: 'default',
    }

    componentDidMount() {
        this.setupEventListeners()
    }

    componentWillUnmount() {
        if (this.boxRef && this.removeEventListeners) {
            this.removeEventListeners()
        }
    }

    focus() {
        this.annotEditRef?.current?.focusOnInputEnd()
    }

    private get isEdited(): boolean {
        return (
            this.props.lastEdited &&
            this.props.lastEdited !== this.props.createdWhen
        )
    }

    private get theme(): SidebarAnnotationTheme {
        return {
            cursor: this.props.isClickable ? 'pointer' : 'auto',
            hasComment: this.props.comment?.length > 0,
            hasHighlight: this.props.body?.length > 0,
            isActive: this.props.isActive,
            isEditing: this.props.mode === 'edit',
        }
    }

    private setupEventListeners = () => {
        if (this.boxRef) {
            const handleMouseEnter = () =>
                this.props.onMouseEnter?.(this.props.url)
            const handleMouseLeave = () =>
                this.props.onMouseLeave?.(this.props.url)

            this.boxRef.addEventListener('mouseenter', handleMouseEnter)
            this.boxRef.addEventListener('mouseleave', handleMouseLeave)

            this.removeEventListeners = () => {
                this.boxRef.removeEventListener('mouseenter', handleMouseEnter)
                this.boxRef.removeEventListener('mouseleave', handleMouseLeave)
            }
        }
    }

    private setBoxRef = (ref: HTMLDivElement) => {
        this.boxRef = ref
    }

    private getFormattedTimestamp = () =>
        niceTime(this.props.lastEdited ?? this.props.createdWhen)

    private handleGoToAnnotation = () => {
        if (!this.props.isClickable) {
            return
        }

        this.props.onGoToAnnotation(this.props.url)
    }

    private renderHighlightBody() {
        if (!this.props.body) {
            return
        }

        return (
            <HighlightStyled>
                <TextTruncated isHighlight={true} text={this.props.body} />
            </HighlightStyled>
        )
    }

    private renderMainAnnotation() {
        const {
            mode,
            annotationEditDependencies,
            annotationFooterDependencies,
            tagPickerDependencies,
        } = this.props

        if (mode === 'edit') {
            return (
                <AnnotationEdit
                    ref={this.annotEditRef}
                    {...this.props}
                    {...annotationEditDependencies}
                    tagPickerDependencies={tagPickerDependencies}
                    rows={2}
                />
            )
        }

        return (
            <AnnotationView
                {...this.props}
                theme={this.theme}
                onEditIconClick={annotationFooterDependencies.onEditIconClick}
            />
        )
    }

    private renderShareMenu() {
        return (
            <ShareMenuWrapper>
                {this.props.renderShareMenuForAnnotation(this.props.url)}
            </ShareMenuWrapper>
        )
    }

    private renderCopyPaster() {
        return (
            <CopyPasterWrapper>
                {this.props.renderCopyPasterForAnnotation(this.props.url)}
            </CopyPasterWrapper>
        )
    }

    private renderFooter() {
        const {
            annotationFooterDependencies,
            annotationEditDependencies,
            onGoToAnnotation,
            ...props
        } = this.props

        return (
            <AnnotationFooter
                {...props}
                {...annotationFooterDependencies}
                isEdited={this.isEdited}
                timestamp={this.getFormattedTimestamp()}
            />
        )
    }

    render() {
        const footerDeps = this.props.annotationFooterDependencies

        return (
            <ThemeProvider theme={this.theme}>
                <StyledItemBox>
                    <Annotation
                        id={this.props.url} // Focusing on annotation relies on this ID.
                        ref={this.setBoxRef}
                        onClick={this.handleGoToAnnotation}
                    >
                        {this.renderHighlightBody()}
                        {this.renderMainAnnotation()}
                        {this.renderCopyPaster()}
                        {this.renderShareMenu()}
                        <ItemBoxBottom
                            creationInfo={{
                                createdWhen: new Date(
                                    this.props.createdWhen,
                                ).getTime(),
                            }}
                            actions={[
                                {
                                    image: this.props.isBookmarked
                                        ? icons.heartFull
                                        : icons.heartEmpty,
                                    onClick: footerDeps.toggleBookmark,
                                    key: 'bookmark-note-btn',
                                },
                                {
                                    image: icons.copy,
                                    key: 'copy-paste-note-btn',
                                    onClick: footerDeps.onCopyPasterBtnClick,
                                },
                                {
                                    image: icons.trash,
                                    key: 'delete-note-btn',
                                    onClick: footerDeps.onDeleteIconClick,
                                },
                                // TODO: implement tag thing
                                // {
                                //     image: this.props.tags?.length > 0 ? icons.tagFull : icons.tagEmpty,
                                //     key: 'tag-note-btn',
                                //     onClick: footerDeps.on
                                // },
                                // TODO: implement reply
                                // {
                                //     image: icons.commentAdd,
                                //     key: 'reply-to-note-btn',
                                //     onClick: footerDeps.onReplyBtnClick
                                // }
                                footerDeps.onGoToAnnotation
                                    ? {
                                          image: icons.goTo,
                                          key: 'go-to-note-btn',
                                          onClick: footerDeps.onGoToAnnotation,
                                      }
                                    : undefined,
                            ]}
                        />
                    </Annotation>
                </StyledItemBox>
            </ThemeProvider>
        )
    }
}

const ShareMenuWrapper = styled.div`
    position: relative;
`
const CopyPasterWrapper = styled.div`
    position: relative;
    left: 70px;
`

const HighlightStyled = styled.div`
    font-weight: 400;
    font-size: 14px;
    letter-spacing: 0.5px;
    margin: 0 0 5px 0;
    padding: 10px 15px 7px 10px;
    line-height: 20px;
    text-align: left;
    line-break: normal;
`

const StyledItemBox = styled(ItemBox)`
    margin: 10px 0 5px 0;

    ${({ theme }) => theme.isActive && `box-shadow: 0px 0px 5px 1px #00000080;`}
    ${({ theme }) =>
        theme.isEditing &&
        `
        background-color: white;
        cursor: default;

        &:hover {
            background-color: white;
        }
    `}
`

const Annotation = styled.div`
    padding: 15px;
`
