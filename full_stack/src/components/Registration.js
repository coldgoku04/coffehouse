import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Registration.css';
import { apiUrl } from '../config/api';

const Registration = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Step 1
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        dateOfBirth: '',

        // Step 2
        education: '',
        schoolName: '',
        collegeName: '',
        degreeDetails: '',
        courseStream: '',
        yearOfPassing: '',
        rollNumber: '',
        govIdType: '',
        govIdFile: null,
        govIdFileName: '',

        // Step 3
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India'
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const roles = [
        { value: 'CUSTOMER', label: 'Customer' },
        { value: 'CAFE_OWNER', label: 'Cafe Owner' }
    ];

    const educationLevels = [
        { value: '', label: 'Select education level' },
        { value: '10TH', label: '10th Standard' },
        { value: '12TH', label: '12th Standard' },
        { value: 'UG', label: 'Undergraduate (UG)' },
        { value: 'PG', label: 'Postgraduate (PG)' }
    ];

    const govIdTypes = [
        { value: '', label: 'Select Document Type' },
        { value: 'AADHAR', label: 'Aadhar Card' },
        { value: 'PAN', label: 'PAN Card' },
        { value: 'DRIVING_LICENSE', label: 'Driving License' },
        { value: 'VOTER_ID', label: 'Voter ID' },
        { value: 'PASSPORT', label: 'Passport' }
    ];

    const countries = ['India', 'USA', 'UK', 'Canada', 'Australia'];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 16 }, (_, i) => currentYear - 10 + i);
    const rolesRequiringEducation = ['CAFE_OWNER'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear education fields when switching levels
        if (name === 'education') {
            setFormData(prev => ({
                ...prev,
                schoolName: '',
                collegeName: '',
                degreeDetails: '',
                courseStream: '',
                yearOfPassing: '',
                rollNumber: ''
            }));
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                setErrors(prev => ({
                    ...prev,
                    govIdFile: 'Only JPG, PNG, or PDF files are allowed'
                }));
                return;
            }

            // Validate file size (2MB)
            if (file.size > 2 * 1024 * 1024) {
                setErrors(prev => ({
                    ...prev,
                    govIdFile: 'File size must be less than 2MB'
                }));
                return;
            }

            setFormData(prev => ({
                ...prev,
                govIdFile: file,
                govIdFileName: file.name
            }));
            setErrors(prev => ({ ...prev, govIdFile: '' }));
        }
    };

    const validateStep1 = () => {
        const newErrors = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        } else if (formData.firstName.trim().length < 2) {
            newErrors.firstName = 'First name must be at least 2 characters';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        } else if (formData.lastName.trim().length < 2) {
            newErrors.lastName = 'Last name must be at least 2 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Please enter a valid 10-digit phone number';
        }

        if (!formData.role) {
            newErrors.role = 'Please select a role';
        }
        if (!formData.dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};
        const educationRequired = rolesRequiringEducation.includes(formData.role);

        if (educationRequired && !formData.education) {
            newErrors.education = 'Education qualification is required for Cafe Owner role';
        }

        if (formData.education) {
            if (formData.education === '10TH' || formData.education === '12TH') {
                if (!formData.schoolName.trim()) {
                    newErrors.schoolName = 'School name is required';
                }
                if (!formData.yearOfPassing) {
                    newErrors.yearOfPassing = 'Year of passing is required';
                }
            } else if (formData.education === 'UG' || formData.education === 'PG') {
                if (!formData.degreeDetails.trim()) {
                    newErrors.degreeDetails = 'Degree details are required';
                }
                if (!formData.collegeName.trim()) {
                    newErrors.collegeName = 'College name is required';
                }
                if (!formData.courseStream.trim()) {
                    newErrors.courseStream = 'Course/Stream is required';
                }
                if (!formData.yearOfPassing) {
                    newErrors.yearOfPassing = 'Year of passing is required';
                }
                if (!formData.rollNumber.trim()) {
                    newErrors.rollNumber = 'Roll number is required';
                }
            }
        }

        // Government ID is mandatory
        if (!formData.govIdType) {
            newErrors.govIdType = 'Please select a document type';
        }

        if (!formData.govIdFile) {
            newErrors.govIdFile = 'Please upload your government ID';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep3 = () => {
        const newErrors = {};

        if (!formData.address.trim()) {
            newErrors.address = 'Address is required';
        }

        if (!formData.city.trim()) {
            newErrors.city = 'City is required';
        }

        if (!formData.state.trim()) {
            newErrors.state = 'State is required';
        }

        if (!formData.postalCode.trim()) {
            newErrors.postalCode = 'Postal code is required';
        } else if (!/^\d{6}$/.test(formData.postalCode)) {
            newErrors.postalCode = 'Please enter a valid 6-digit postal code';
        }

        if (!formData.country) {
            newErrors.country = 'Please select a country';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        let isValid = false;

        if (currentStep === 1) {
            isValid = validateStep1();
        } else if (currentStep === 2) {
            isValid = validateStep2();
        } else if (currentStep === 3) {
            isValid = validateStep3();
        }

        if (isValid) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Prepare FormData for multipart/form-data (required for file upload)
            const { govIdFile, govIdFileName, ...userFields } = formData;
            const formAPIData = new FormData();

            // Send all non-file fields as JSON in "user"
            formAPIData.append('user', JSON.stringify(userFields));

            // File part
            if (formData.govIdFile) {
                formAPIData.append('govIdFile', formData.govIdFile, formData.govIdFileName || formData.govIdFile.name);
            }

            // Call your backend (now on port 8080)
            const response = await fetch(apiUrl('/api/registration/register'), {
                method: "POST",
                body: formAPIData
                // Do not set Content-Type header! Browser will handle it.
            });

            const result = await response.text();

            if (response.ok) {
                setIsSubmitted(true);
                setTimeout(() => {
                    navigate('/signin');
                }, 2000);
            } else {
                setErrors({ submit: result || "Registration failed. Please try again." });
            }
        } catch (error) {
            setErrors({ submit: "Registration failed. Server unreachable." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditStep = (step) => {
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getProgressPercentage = () => {
        return (currentStep / 4) * 100;
    };

    const renderProgressBar = () => {
        return (
            <div className="wizard-progress">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                </div>
                <div className="progress-steps">
                    {[1, 2, 3, 4].map(step => (
                        <div
                            key={step}
                            className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
                        >
                            <div className="step-circle">{step}</div>
                            <div className="step-label">
                                {step === 1 && 'Personal'}
                                {step === 2 && 'Education'}
                                {step === 3 && 'Address'}
                                {step === 4 && 'Review'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderStep1 = () => {
        return (
            <div className="wizard-step">
                <h2 className="step-title">Personal Information</h2>
                <p className="step-subtitle">Let's start with your basic details</p>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="firstName">First Name *</label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="Enter your first name"
                            className={errors.firstName ? 'error' : ''}
                        />
                        {errors.firstName && <span className="field-error">{errors.firstName}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="lastName">Last Name *</label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="Enter your last name"
                            className={errors.lastName ? 'error' : ''}
                        />
                        {errors.lastName && <span className="field-error">{errors.lastName}</span>}
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your.email@example.com"
                        className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <span className="field-error">{errors.phone}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="dateOfBirth">Date of Birth *</label>
                    <input
                        type="date"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className={errors.dateOfBirth ? 'error' : ''}
                    />
                    {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="role">Select Your Role *</label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className={errors.role ? 'error' : ''}
                    >
                        <option value="">Choose your role</option>
                        {roles.map(role => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </select>
                    {errors.role && <span className="field-error">{errors.role}</span>}
                </div>
            </div>
        );
    };

    const renderStep2 = () => {
        return (
            <div className="wizard-step">
                <h2 className="step-title">Education & Verification</h2>
                <p className="step-subtitle">Educational background and identity verification. Education is mandatory for Cafe Owner role.</p>

                <div className="section-divider">
                    <h3 className="section-title">📚 Education Details</h3>
                </div>

                <div className="form-group">
                    <label htmlFor="education">Education Level {rolesRequiringEducation.includes(formData.role) ? '*' : ''}</label>
                    <select
                        id="education"
                        name="education"
                        value={formData.education}
                        onChange={handleChange}
                        className={errors.education ? 'error' : ''}
                    >
                        {educationLevels.map(edu => (
                            <option key={edu.value} value={edu.value}>
                                {edu.label}
                            </option>
                        ))}
                    </select>
                    {errors.education && <span className="field-error">{errors.education}</span>}
                </div>

                {/* School Details for 10th/12th */}
                {(formData.education === '10TH' || formData.education === '12TH') && (
                    <>
                        <div className="form-group">
                            <label htmlFor="schoolName">School Name *</label>
                            <input
                                type="text"
                                id="schoolName"
                                name="schoolName"
                                value={formData.schoolName}
                                onChange={handleChange}
                                placeholder="Enter your school name"
                                className={errors.schoolName ? 'error' : ''}
                            />
                            {errors.schoolName && <span className="field-error">{errors.schoolName}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="yearOfPassing">Year of Passing *</label>
                            <select
                                id="yearOfPassing"
                                name="yearOfPassing"
                                value={formData.yearOfPassing}
                                onChange={handleChange}
                                className={errors.yearOfPassing ? 'error' : ''}
                            >
                                <option value="">Select year</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            {errors.yearOfPassing && <span className="field-error">{errors.yearOfPassing}</span>}
                        </div>
                    </>
                )}

                {/* College Details for UG/PG */}
                {(formData.education === 'UG' || formData.education === 'PG') && (
                    <>
                        <div className="form-group">
                            <label htmlFor="degreeDetails">Degree Details *</label>
                            <input
                                type="text"
                                id="degreeDetails"
                                name="degreeDetails"
                                value={formData.degreeDetails}
                                onChange={handleChange}
                                placeholder="e.g., B.Tech Computer Science, MBA Finance"
                                className={errors.degreeDetails ? 'error' : ''}
                            />
                            {errors.degreeDetails && <span className="field-error">{errors.degreeDetails}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="collegeName">College/University Name *</label>
                            <input
                                type="text"
                                id="collegeName"
                                name="collegeName"
                                value={formData.collegeName}
                                onChange={handleChange}
                                placeholder="Enter your college/university name"
                                className={errors.collegeName ? 'error' : ''}
                            />
                            {errors.collegeName && <span className="field-error">{errors.collegeName}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="course">Course/Stream *</label>
                            <input
                                type="text"
                                id="courseStream"
                                name="courseStream"
                                value={formData.courseStream}
                                onChange={handleChange}
                                placeholder="e.g., Computer Science, Mechanical Engineering"
                                className={errors.courseStream ? 'error' : ''}
                            />
                            {errors.courseStream && <span className="field-error">{errors.courseStream}</span>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="yearOfPassing">Year of Passing *</label>
                                <select
                                    id="yearOfPassing"
                                    name="yearOfPassing"
                                    value={formData.yearOfPassing}
                                    onChange={handleChange}
                                    className={errors.yearOfPassing ? 'error' : ''}
                                >
                                    <option value="">Select year</option>
                                    {years.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                {errors.yearOfPassing && <span className="field-error">{errors.yearOfPassing}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="rollNumber">Roll Number / Student ID *</label>
                                <input
                                    type="text"
                                    id="rollNumber"
                                    name="rollNumber"
                                    value={formData.rollNumber}
                                    onChange={handleChange}
                                    placeholder="Enter your roll number"
                                    className={errors.rollNumber ? 'error' : ''}
                                />
                                {errors.rollNumber && <span className="field-error">{errors.rollNumber}</span>}
                            </div>
                        </div>
                    </>
                )}

                <div className="section-divider">
                    <h3 className="section-title">📄 Government ID Proof (Required)</h3>
                </div>

                <div className="form-group">
                    <label htmlFor="govIdType">Document Type *</label>
                    <select
                        id="govIdType"
                        name="govIdType"
                        value={formData.govIdType}
                        onChange={handleChange}
                        className={errors.govIdType ? 'error' : ''}
                    >
                        {govIdTypes.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                    {errors.govIdType && <span className="field-error">{errors.govIdType}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="govIdFile">Upload Document *</label>
                    <div className="file-upload-wrapper">
                        <input
                            type="file"
                            id="govIdFile"
                            name="govIdFile"
                            onChange={handleFileChange}
                            accept=".jpg,.jpeg,.png,.pdf"
                            className="file-input"
                        />
                        <label htmlFor="govIdFile" className="file-label">
                            <span className="file-icon"></span>
                            <span className="file-text">
                                {formData.govIdFileName || 'Choose file (JPG, PNG, PDF - Max 2MB)'}
                            </span>
                        </label>
                        {formData.govIdFileName && (
                            <div className="file-preview">
                                ✅ {formData.govIdFileName}
                            </div>
                        )}
                    </div>
                    {errors.govIdFile && <span className="field-error">{errors.govIdFile}</span>}
                </div>
            </div>
        );
    };

    const renderStep3 = () => {
        return (
            <div className="wizard-step">
                <h2 className="step-title">Address Information</h2>
                <p className="step-subtitle">Where can we reach you?</p>

                <div className="form-group">
                    <label htmlFor="address">Street Address *</label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your street address"
                        className={errors.address ? 'error' : ''}
                    />
                    {errors.address && <span className="field-error">{errors.address}</span>}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="city">City *</label>
                        <input
                            type="text"
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            placeholder="City"
                            className={errors.city ? 'error' : ''}
                        />
                        {errors.city && <span className="field-error">{errors.city}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="state">State *</label>
                        <input
                            type="text"
                            id="state"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            placeholder="State"
                            className={errors.state ? 'error' : ''}
                        />
                        {errors.state && <span className="field-error">{errors.state}</span>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="postalCode">Postal Code *</label>
                        <input
                            type="text"
                            id="postalCode"
                            name="postalCode"
                            value={formData.postalCode}
                            onChange={handleChange}
                            placeholder="6-digit code"
                            className={errors.postalCode ? 'error' : ''}
                        />
                        {errors.postalCode && <span className="field-error">{errors.postalCode}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="country">Country *</label>
                        <select
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            className={errors.country ? 'error' : ''}
                        >
                            {countries.map(country => (
                                <option key={country} value={country}>
                                    {country}
                                </option>
                            ))}
                        </select>
                        {errors.country && <span className="field-error">{errors.country}</span>}
                    </div>
                </div>
            </div>
        );
    };

    const renderStep4 = () => {
        return (
            <div className="wizard-step">
                <h2 className="step-title">Review & Submit</h2>
                <p className="step-subtitle">Please review your information before submitting</p>

                <div className="review-section">
                    <div className="review-header">
                        <h3>👤 Personal Information</h3>
                        <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEditStep(1)}
                        >
                            Edit
                        </button>
                    </div>
                    <div className="review-content">
                        <div className="review-item">
                            <span className="review-label">Name:</span>
                            <span className="review-value">{formData.firstName} {formData.lastName}</span>
                        </div>
                        <div className="review-item">
                            <span className="review-label">Email:</span>
                            <span className="review-value">{formData.email}</span>
                        </div>
                        <div className="review-item">
                            <span className="review-label">Phone:</span>
                            <span className="review-value">{formData.phone}</span>
                        </div>
                        <div className="review-item">
                            <span className="review-label">Date of Birth:</span>
                            <span className="review-value">{formData.dateOfBirth}</span>
                        </div>
                        <div className="review-item">
                            <span className="review-label">Role:</span>
                            <span className="review-value">
                                {roles.find(r => r.value === formData.role)?.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="review-section">
                    <div className="review-header">
                        <h3>🎓 Education & Verification</h3>
                        <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEditStep(2)}
                        >
                            Edit
                        </button>
                    </div>
                    <div className="review-content">
                        {formData.education ? (
                            <>
                                <div className="review-item">
                                    <span className="review-label">Education Level:</span>
                                    <span className="review-value">
                                        {educationLevels.find(e => e.value === formData.education)?.label}
                                    </span>
                                </div>

                                {(formData.education === '10TH' || formData.education === '12TH') && (
                                    <>
                                        <div className="review-item">
                                            <span className="review-label">School Name:</span>
                                            <span className="review-value">{formData.schoolName}</span>
                                        </div>
                                        <div className="review-item">
                                            <span className="review-label">Year of Passing:</span>
                                            <span className="review-value">{formData.yearOfPassing}</span>
                                        </div>
                                    </>
                                )}

                                {(formData.education === 'UG' || formData.education === 'PG') && (
                                    <>
                                        <div className="review-item">
                                            <span className="review-label">Degree:</span>
                                            <span className="review-value">{formData.degreeDetails}</span>
                                        </div>
                                        <div className="review-item">
                                            <span className="review-label">College:</span>
                                            <span className="review-value">{formData.collegeName}</span>
                                        </div>
                                        <div className="review-item">
                                            <span className="review-label">Course:</span>
                                            <span className="review-value">{formData.courseStream}</span>
                                        </div>
                                        <div className="review-item">
                                            <span className="review-label">Year of Passing:</span>
                                            <span className="review-value">{formData.yearOfPassing}</span>
                                        </div>
                                        <div className="review-item">
                                            <span className="review-label">Roll Number:</span>
                                            <span className="review-value">{formData.rollNumber}</span>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="review-item">
                                <span className="review-value-muted">{rolesRequiringEducation.includes(formData.role) ? 'Education details are required for this role' : 'No education details provided'}</span>
                            </div>
                        )}

                        <div className="review-item">
                            <span className="review-label">Government ID:</span>
                            <span className="review-value">
                                {govIdTypes.find(t => t.value === formData.govIdType)?.label}
                            </span>
                        </div>
                        <div className="review-item">
                            <span className="review-label">Document:</span>
                            <span className="review-value">📄 {formData.govIdFileName}</span>
                        </div>
                    </div>
                </div>

                <div className="review-section">
                    <div className="review-header">
                        <h3>📍 Address Information</h3>
                        <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEditStep(3)}
                        >
                            Edit
                        </button>
                    </div>
                    <div className="review-content">
                        <div className="review-item">
                            <span className="review-label">Address:</span>
                            <span className="review-value">{formData.address}</span>
                        </div>
                        <div className="review-item">
                            <span className="review-label">City:</span>
                            <span className="review-value">{formData.city}</span>
                        </div>
                        <div className="review-item">
                            <span className="review-label">State:</span>
                            <span className="review-value">{formData.state}</span>
                        </div>
                        <div className="review-item">
                            <span className="review-label">Postal Code:</span>
                            <span className="review-value">{formData.postalCode}</span>
                        </div>
                        <div className="review-item">
                            <span className="review-label">Country:</span>
                            <span className="review-value">{formData.country}</span>
                        </div>
                    </div>
                </div>

                <div className="terms-section">
                    <label className="checkbox-label">
                        <input type="checkbox" required />
                        <span>I agree to the Terms & Conditions and Privacy Policy</span>
                    </label>
                </div>
            </div>
        );
    };

    if (isSubmitted) {
        return (
            <div className="registration-page">
                <div className="success-container">
                    <div className="success-icon">✅</div>
                    <h2>Registration Successful!</h2>
                    <p>Your account has been created successfully.</p>
                    <p>Redirecting to sign in page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="registration-page">
            <button className="home-icon-btn" onClick={() => navigate('/')}>
                <span>🏠</span>
            </button>

            <div className="registration-container wizard-container">
                <div className="registration-header">
                    <h1>☕ Cafe House Registration</h1>
                    <p className="header-subtitle">Step {currentStep} of 4</p>
                </div>

                {renderProgressBar()}

                <form onSubmit={handleSubmit} className="registration-form">
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}

                    <div className="wizard-actions">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleBack}
                                disabled={isLoading}
                            >
                                ← Back
                            </button>
                        )}

                        {currentStep < 4 ? (
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleNext}
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className="btn-primary btn-submit"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Registration'
                                )}
                            </button>
                        )}
                    </div>

                    {errors.submit && (
                        <div className="error-message">{errors.submit}</div>
                    )}
                </form>

                <div className="signin-link">
                    Already have an account? <a href="/signin">Sign In</a>
                </div>
            </div>
        </div>
    );
};

export default Registration;



